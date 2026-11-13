<?php

namespace App\Services;

use App\Exceptions\ReservationException;
use App\Models\Reservation;
use App\Models\Space;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class ReservationService
{
    /**
     * Cria a reserva de forma atômica.
     *
     * Concorrência: a linha do local é bloqueada (SELECT ... FOR UPDATE) dentro da transação. Assim, dois
     * pedidos simultâneos para o mesmo local são serializados e o segundo enxerga a reserva do primeiro na
     * checagem de sobreposição. Como o bloqueio é por local, reservas de locais diferentes não se atrapalham.
     * Em caso de deadlock, a transação é repetida até 3 vezes.
     */
    public function create(Space $space, User $user, string $rate, CarbonImmutable $start, CarbonImmutable $end): Reservation
    {
        return DB::transaction(function () use ($space, $user, $rate, $start, $end) {
            $locked = Space::query()->whereKey($space->id)->lockForUpdate()->first();

            if (! $locked || ! $locked->is_active) {
                throw new ReservationException('Este local não está disponível para reservas.', 404);
            }

            if ($locked->user_id === $user->id) {
                throw new ReservationException('Você não pode reservar o seu próprio local.', 403);
            }

            [$startsAt, $endsAt, $price] = $this->resolvePeriod($locked, $rate, $start, $end);

            if (Reservation::query()->where('space_id', $locked->id)->overlapping($startsAt, $endsAt)->exists()) {
                throw ReservationException::conflict();
            }

            return Reservation::create([
                'space_id' => $locked->id,
                'user_id' => $user->id,
                'starts_at' => $startsAt,
                'ends_at' => $endsAt,
                'rate' => $rate,
                'status' => Reservation::STATUS_CONFIRMED,
                'total_price' => $price,
            ]);
        }, 3);
    }

    /** Cancela de forma idempotente. A autorização (dono, gestor do local ou admin) é feita no controller. */
    public function cancel(Reservation $reservation, User $actor): Reservation
    {
        return DB::transaction(function () use ($reservation, $actor) {
            $locked = Reservation::query()->whereKey($reservation->id)->lockForUpdate()->firstOrFail();

            if ($locked->isCancelled()) {
                return $locked;
            }

            if ($locked->ends_at->isPast()) {
                throw new ReservationException('Reservas já encerradas não podem ser canceladas.');
            }

            // A antecedência mínima vale só para o cliente; quem gerencia o local pode cancelar a qualquer momento.
            $manages = $actor->isAdmin() || $locked->space()->value('user_id') === $actor->id;
            $notice = (int) config('coworking.reservations.cancellation_notice_hours');

            if (! $manages && $locked->starts_at->subHours($notice)->isPast()) {
                throw new ReservationException("O cancelamento é permitido até {$notice}h antes do início.");
            }

            $locked->update(['status' => Reservation::STATUS_CANCELLED, 'cancelled_at' => now()]);

            return $locked;
        });
    }

    /** Intervalos ocupados de um dia (sem dados pessoais) para a tela de escolha de horário. */
    public function busyOn(Space $space, CarbonImmutable $day): Collection
    {
        return Reservation::query()
            ->where('space_id', $space->id)
            ->overlapping($day->startOfDay()->utc(), $day->endOfDay()->utc())
            ->orderBy('starts_at')
            ->get(['id', 'space_id', 'starts_at', 'ends_at']);
    }

    /**
     * Valida janela/horários/preço e devolve [início UTC, fim UTC, valor total].
     *
     * @return array{0: CarbonImmutable, 1: CarbonImmutable, 2: float}
     */
    private function resolvePeriod(Space $space, string $rate, CarbonImmutable $start, CarbonImmutable $end): array
    {
        $tz = config('coworking.timezone');
        $start = $start->setTimezone($tz);
        $end = $end->setTimezone($tz);
        $limit = config('coworking.reservations');

        $price = match ($rate) {
            Reservation::RATE_HOURLY => $space->hourly_price,
            Reservation::RATE_DAILY => $space->daily_price,
            default => throw new ReservationException('Modalidade de reserva inválida.'),
        };

        if ($price === null && ! $space->is_free) {
            throw new ReservationException('Este local não aceita reservas nesta modalidade.');
        }

        if ($start->gt(now($tz)->addDays($limit['max_advance_days']))) {
            throw new ReservationException("Só é possível reservar com até {$limit['max_advance_days']} dias de antecedência.");
        }

        $period = $rate === Reservation::RATE_HOURLY
            ? $this->hourly($space, $start, $end, (float) $price)
            : $this->daily($space, $start, $end, (float) $price);

        return [
            $period['start']->utc(),
            $period['end']->utc(),
            $space->is_free ? 0.0 : round($period['total'], 2),
        ];
    }

    private function hourly(Space $space, CarbonImmutable $start, CarbonImmutable $end, float $price): array
    {
        $slot = (int) config('coworking.reservations.slot_minutes');
        $minutes = (int) $start->diffInMinutes($end, false);

        if ($minutes <= 0) {
            throw new ReservationException('O término deve ser depois do início.');
        }

        if ($start->isPast()) {
            throw new ReservationException('Escolha um horário no futuro.');
        }

        if ($start->minute % $slot !== 0 || $start->second !== 0 || $minutes % $slot !== 0) {
            throw new ReservationException("Os horários devem ser em blocos de {$slot} minutos.");
        }

        // Reserva por hora não atravessa o dia (exceto terminar exatamente à meia-noite).
        $endsAtMidnight = $end->equalTo($start->addDay()->startOfDay());
        if (! $start->isSameDay($end) && ! $endsAtMidnight) {
            throw new ReservationException('A reserva por hora deve começar e terminar no mesmo dia.');
        }

        $startMin = $start->hour * 60 + $start->minute;
        $endMin = $startMin + $minutes;
        $window = $this->windowFor($space, $start->dayOfWeek);

        if ($window === null || $startMin < $window[0] || $endMin > $window[1]) {
            throw new ReservationException('O horário escolhido está fora da disponibilidade do local.');
        }

        return ['start' => $start, 'end' => $end, 'total' => $price * $minutes / 60];
    }

    private function daily(Space $space, CarbonImmutable $start, CarbonImmutable $end, float $price): array
    {
        $max = (int) config('coworking.reservations.max_days');
        $first = $start->startOfDay();
        $last = $end->startOfDay();

        if ($last->lt($first)) {
            throw new ReservationException('A data final deve ser igual ou posterior à inicial.');
        }

        if ($first->lt(now($first->timezone)->startOfDay())) {
            throw new ReservationException('Escolha uma data a partir de hoje.');
        }

        $days = (int) $first->diffInDays($last) + 1;

        if ($days > $max) {
            throw new ReservationException("A reserva diária pode ter no máximo {$max} dias.");
        }

        for ($d = $first; $d->lte($last); $d = $d->addDay()) {
            if ($this->windowFor($space, $d->dayOfWeek) === null) {
                throw new ReservationException('O local não está disponível em um ou mais dias do período escolhido.');
            }
        }

        // Intervalo semiaberto: termina no início do dia seguinte ao último dia reservado.
        return ['start' => $first, 'end' => $last->addDay(), 'total' => $price * $days];
    }

    /**
     * Janela [início, fim] em minutos do dia, ou null se o local não abre. Usa "availability" (dias liberados
     * para locação) e, na falta dela, "opening_hours". Sem nenhuma configuração, considera o dia todo livre.
     *
     * @return array{0: int, 1: int}|null
     */
    public function windowFor(Space $space, int $dayOfWeek): ?array
    {
        $config = $space->availability ?: $space->opening_hours;

        if (! $config) {
            return [0, 1440];
        }

        foreach ($config as $row) {
            if ((int) ($row['day'] ?? -1) !== $dayOfWeek) {
                continue;
            }

            if (empty($row['enabled'])) {
                return null;
            }

            return [$this->toMinutes($row['from'] ?? '00:00'), $this->toMinutes($row['to'] ?? '24:00')];
        }

        return null;
    }

    private function toMinutes(string $hhmm): int
    {
        [$h, $m] = array_pad(explode(':', $hhmm), 2, 0);

        return ((int) $h) * 60 + (int) $m;
    }
}
