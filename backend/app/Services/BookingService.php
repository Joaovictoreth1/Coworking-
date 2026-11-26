<?php

declare(strict_types=1);

namespace App\Services;

use App\Exceptions\BookingConflictException;
use App\Models\Booking;
use App\Models\Space;
use App\Models\User;
use Carbon\Carbon;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

class BookingService
{
    /**
     * Valida se não há sobreposição de horário (Double-Booking).
     *
     * @throws BookingConflictException
     */
    public function validateNoOverlap(
        Space $space,
        CarbonInterface $startTime,
        CarbonInterface $endTime,
        ?int $excludeBookingId = null
    ): void {
        $startUtc = $startTime->copy()->utc();
        $endUtc = $endTime->copy()->utc();

        $overlapExists = Booking::query()
            ->where('space_id', $space->id)
            ->overlapping($startUtc, $endUtc, $excludeBookingId)
            ->exists();

        if ($overlapExists) {
            throw BookingConflictException::overlap();
        }
    }

    /**
     * Valida se o horário de início não está no passado.
     *
     * @throws ValidationException
     */
    public function validateNotInPast(CarbonInterface $startTime): void
    {
        if ($startTime->copy()->utc()->lt(now()->utc())) {
            throw ValidationException::withMessages([
                'start_time' => ['O horário de início não pode ser no passado.'],
            ]);
        }
    }

    /**
     * Valida os horários de funcionamento do espaço se configurados.
     *
     * @throws ValidationException
     */
    public function validateWorkingHours(
        Space $space,
        CarbonInterface $startTime,
        CarbonInterface $endTime
    ): void {
        if (! $startTime->lt($endTime)) {
            throw ValidationException::withMessages([
                'end_time' => ['O horário de término deve ser posterior ao horário de início.'],
            ]);
        }

        $schedule = $space->opening_hours;
        if (! is_array($schedule) || empty($schedule)) {
            return;
        }

        $byDay = [];
        foreach ($schedule as $item) {
            if (isset($item['day'])) {
                $byDay[(int) $item['day']] = $item;
            }
        }

        $startDay = $startTime->copy()->startOfDay();
        $endDay = $endTime->copy()->startOfDay();
        $sameDay = $startDay->equalTo($endDay);

        for ($cursor = $startDay->copy(); $cursor->lte($endDay); $cursor->addDay()) {
            $dayConfig = $byDay[$cursor->dayOfWeek] ?? null;

            if ($dayConfig === null) {
                continue;
            }

            if (empty($dayConfig['enabled'])) {
                throw ValidationException::withMessages([
                    'start_time' => ['O espaço não funciona no dia selecionado.'],
                ]);
            }

            if (empty($dayConfig['from']) || empty($dayConfig['to'])) {
                continue;
            }

            if ($sameDay) {
                $timeStartStr = $startTime->format('H:i');
                $timeEndStr = $endTime->format('H:i');

                if ($timeStartStr < $dayConfig['from'] || $timeEndStr > $dayConfig['to']) {
                    throw ValidationException::withMessages([
                        'start_time' => [
                            "O horário de funcionamento neste dia é das {$dayConfig['from']} às {$dayConfig['to']}.",
                        ],
                    ]);
                }
            } elseif ($cursor->equalTo($startDay)) {
                if ($startTime->format('H:i') < $dayConfig['from'] || $startTime->format('H:i') >= $dayConfig['to']) {
                    throw ValidationException::withMessages([
                        'start_time' => [
                            "O horário de funcionamento neste dia é das {$dayConfig['from']} às {$dayConfig['to']}.",
                        ],
                    ]);
                }
            } elseif ($cursor->equalTo($endDay)) {
                if ($endTime->format('H:i') > $dayConfig['to'] || $endTime->format('H:i') <= $dayConfig['from']) {
                    throw ValidationException::withMessages([
                        'end_time' => [
                            "O horário de funcionamento no dia de término é das {$dayConfig['from']} às {$dayConfig['to']}.",
                        ],
                    ]);
                }
            }
        }
    }

    /**
     * Calcula automaticamente o valor total com base na duração e nas tarifas do espaço.
     */
    public function calculateTotalPrice(
        Space $space,
        CarbonInterface $startTime,
        CarbonInterface $endTime
    ): float {
        if ($space->is_free) {
            return 0.00;
        }

        $diffMinutes = $startTime->diffInMinutes($endTime);
        if ($diffMinutes <= 0) {
            return 0.00;
        }

        $totalHours = (int) ceil($diffMinutes / 60);

        // Se passar de 24h e tiver diária definida
        if ($totalHours >= 24 && ! empty($space->daily_price)) {
            $days = (int) floor($totalHours / 24);
            $remainingHours = $totalHours % 24;
            $hourlyRate = (float) ($space->hourly_price ?? ($space->daily_price / 8));

            $total = ($days * (float) $space->daily_price) + ($remainingHours * $hourlyRate);

            return round($total, 2);
        }

        if (! empty($space->hourly_price)) {
            return round($totalHours * (float) $space->hourly_price, 2);
        }

        if (! empty($space->daily_price)) {
            $days = (int) ceil($totalHours / 24);

            return round($days * (float) $space->daily_price, 2);
        }

        return 0.00;
    }

    /**
     * Cria uma nova reserva garantindo concorrência segura (transação + lock na linha do espaço).
     *
     * @throws ValidationException
     * @throws BookingConflictException
     */
    public function createBooking(User $user, Space $space, array $data): Booking
    {
        $startTime = Carbon::parse($data['start_time']);
        $endTime = Carbon::parse($data['end_time']);

        $this->validateNotInPast($startTime);

        $startUtc = $startTime->copy()->utc();
        $endUtc = $endTime->copy()->utc();

        return DB::transaction(function () use ($user, $space, $startTime, $endTime, $startUtc, $endUtc, $data) {
            // Bloqueia a linha do espaço para serializar pedidos concorrentes no mesmo local,
            // inclusive quando ainda não existe nenhuma reserva prévia na tabela bookings.
            $lockedSpace = Space::query()->whereKey($space->id)->lockForUpdate()->first();

            if (! $lockedSpace || ! $lockedSpace->is_active) {
                throw ValidationException::withMessages([
                    'space_id' => ['Este espaço está temporariamente inativo para reservas.'],
                ]);
            }

            $this->validateWorkingHours($lockedSpace, $startTime, $endTime);
            $this->validateNoOverlap($lockedSpace, $startUtc, $endUtc);

            $totalPrice = $this->calculateTotalPrice($lockedSpace, $startUtc, $endUtc);

            return Booking::create([
                'user_id' => $user->id,
                'space_id' => $lockedSpace->id,
                'start_time' => $startUtc,
                'end_time' => $endUtc,
                'total_price' => $totalPrice,
                'status' => Booking::STATUS_CONFIRMED,
                'notes' => $data['notes'] ?? null,
            ]);
        }, 3);
    }

    /**
     * Cancela uma reserva existente com verificação de autorização e estado.
     *
     * @throws AccessDeniedHttpException
     * @throws BookingConflictException
     */
    public function cancelBooking(Booking $booking, User $user, ?string $reason = null): Booking
    {
        return DB::transaction(function () use ($booking, $user, $reason) {
            $locked = Booking::query()->whereKey($booking->id)->lockForUpdate()->firstOrFail();

            if (! $user->isAdmin() && $locked->user_id !== $user->id) {
                throw new AccessDeniedHttpException('Você não possui permissão para cancelar esta reserva.');
            }

            if ($locked->status === Booking::STATUS_CANCELLED) {
                throw BookingConflictException::invalidStateTransition('Esta reserva já está cancelada.');
            }

            if ($locked->status === Booking::STATUS_COMPLETED) {
                throw BookingConflictException::invalidStateTransition('Reservas já concluídas não podem ser canceladas.');
            }

            $locked->update([
                'status' => Booking::STATUS_CANCELLED,
                'cancelled_at' => now(),
                'cancellation_reason' => $reason,
                'notes' => $reason
                    ? ($locked->notes ? "{$locked->notes} | Cancelamento: {$reason}" : "Cancelamento: {$reason}")
                    : $locked->notes,
            ]);

            return $locked;
        }, 3);
    }

    /**
     * Atualiza o status de uma reserva via painel administrativo, impedindo reativações conflitantes.
     *
     * @throws BookingConflictException
     */
    public function updateBookingStatus(Booking $booking, string $newStatus, ?string $notes = null): Booking
    {
        return DB::transaction(function () use ($booking, $newStatus, $notes) {
            $lockedSpace = Space::query()->whereKey($booking->space_id)->lockForUpdate()->firstOrFail();
            $lockedBooking = Booking::query()->whereKey($booking->id)->lockForUpdate()->firstOrFail();

            $isReactivating = $lockedBooking->status === Booking::STATUS_CANCELLED
                && $newStatus !== Booking::STATUS_CANCELLED;

            if ($isReactivating) {
                $this->validateNoOverlap(
                    $lockedSpace,
                    $lockedBooking->start_time,
                    $lockedBooking->end_time,
                    $lockedBooking->id,
                );
            }

            $updates = [
                'status' => $newStatus,
                'notes' => $notes ?? $lockedBooking->notes,
            ];

            if ($newStatus === Booking::STATUS_CANCELLED && $lockedBooking->cancelled_at === null) {
                $updates['cancelled_at'] = now();
            } elseif ($newStatus !== Booking::STATUS_CANCELLED) {
                $updates['cancelled_at'] = null;
                $updates['cancellation_reason'] = null;
            }

            $lockedBooking->update($updates);

            return $lockedBooking;
        }, 3);
    }

    /**
     * Retorna métricas consolidadas para o Dashboard do Administrador.
     */
    public function getAdminMetrics(): array
    {
        $totalBookings = Booking::count();
        $pendingBookings = Booking::where('status', Booking::STATUS_PENDING)->count();
        $confirmedBookings = Booking::where('status', Booking::STATUS_CONFIRMED)->count();
        $cancelledBookings = Booking::where('status', Booking::STATUS_CANCELLED)->count();
        $completedBookings = Booking::where('status', Booking::STATUS_COMPLETED)->count();

        $totalRevenue = (float) Booking::whereIn('status', [Booking::STATUS_CONFIRMED, Booking::STATUS_COMPLETED])
            ->sum('total_price');

        $activeSpaces = Space::where('is_active', true)->count();
        $totalSpaces = Space::count();

        // Reservas ativas hoje
        $today = Carbon::today();
        $activeBookingsToday = Booking::where('status', Booking::STATUS_CONFIRMED)
            ->whereDate('start_time', '<=', $today)
            ->whereDate('end_time', '>=', $today)
            ->count();

        $occupancyRate = $activeSpaces > 0
            ? round(($activeBookingsToday / $activeSpaces) * 100, 1)
            : 0.0;

        return [
            'total_bookings' => $totalBookings,
            'pending_bookings' => $pendingBookings,
            'confirmed_bookings' => $confirmedBookings,
            'cancelled_bookings' => $cancelledBookings,
            'completed_bookings' => $completedBookings,
            'total_revenue' => $totalRevenue,
            'active_spaces' => $activeSpaces,
            'total_spaces' => $totalSpaces,
            'occupancy_rate' => min(100.0, $occupancyRate),
        ];
    }
}
