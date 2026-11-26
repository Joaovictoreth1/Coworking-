<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Booking;
use App\Models\Space;
use App\Models\User;
use Carbon\Carbon;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Validation\ValidationException;

class BookingService
{
    public function __construct(private readonly SpaceSchedule $schedule) {}

    /**
     * Valida se não há sobreposição de horário (Double-Booking).
     *
     * @throws ValidationException
     */
    private function validateNoOverlap(
        Space $space,
        CarbonInterface $startTime,
        CarbonInterface $endTime,
        ?int $excludeBookingId = null
    ): void {
        if ($this->schedule->hasConflict($space, $startTime, $endTime, $excludeBookingId)) {
            throw ValidationException::withMessages([
                'booking_conflict' => ['Este espaço já possui uma reserva no horário selecionado. Escolha outro intervalo.'],
                'start_time' => ['Horário conflitante com outra reserva ativa.'],
            ]);
        }
    }

    /**
     * Valida os horários de funcionamento do espaço se configurados.
     *
     * @throws ValidationException
     */
    private function validateWorkingHours(
        Space $space,
        CarbonInterface $startTime,
        CarbonInterface $endTime
    ): void {
        if (! $startTime->lt($endTime)) {
            throw ValidationException::withMessages([
                'end_time' => ['O horário de término deve ser posterior ao horário de início.'],
            ]);
        }

        $openingHours = $space->opening_hours;
        if (! is_array($openingHours) || empty($openingHours)) {
            return;
        }

        // Dia da semana: 0 = domingo, 1 = segunda, ..., 6 = sábado
        $startDayOfWeek = $startTime->dayOfWeek;
        $dayConfig = null;

        foreach ($openingHours as $item) {
            if (isset($item['day']) && (int) $item['day'] === $startDayOfWeek) {
                $dayConfig = $item;
                break;
            }
        }

        if ($dayConfig !== null) {
            if (empty($dayConfig['enabled'])) {
                throw ValidationException::withMessages([
                    'start_time' => ['O espaço não funciona no dia selecionado.'],
                ]);
            }

            if (! $startTime->isSameDay($endTime)) {
                throw ValidationException::withMessages([
                    'end_time' => ['A reserva deve começar e terminar no mesmo dia dentro do horário de funcionamento.'],
                ]);
            }

            if (! empty($dayConfig['from']) && ! empty($dayConfig['to'])) {
                $timeStartStr = $startTime->format('H:i');
                $timeEndStr = $endTime->format('H:i');

                if ($timeStartStr < $dayConfig['from'] || $timeEndStr > $dayConfig['to']) {
                    throw ValidationException::withMessages([
                        'start_time' => [
                            "O horário de funcionamento neste dia é das {$dayConfig['from']} às {$dayConfig['to']}.",
                        ],
                    ]);
                }
            }
        }
    }

    /**
     * Calcula automaticamente o valor total com base na duração e nas tarifas do espaço.
     */
    private function calculateTotalPrice(
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

    public function quote(Space $space, CarbonImmutable $start, CarbonImmutable $end): float
    {
        if (! $space->is_active) {
            throw ValidationException::withMessages([
                'space_id' => ['Este espaço está temporariamente inativo para reservas.'],
            ]);
        }

        if ($start->isPast()) {
            throw ValidationException::withMessages([
                'start_time' => ['O horário de início não pode ser no passado.'],
            ]);
        }

        $timezone = config('coworking.timezone');
        $this->validateWorkingHours($space, $start->setTimezone($timezone), $end->setTimezone($timezone));
        $this->validateNoOverlap($space, $start, $end);

        return $this->calculateTotalPrice($space, $start, $end);
    }

    /**
     * Cria uma nova reserva garantindo concorrência segura (transação + bloqueio).
     *
     * @param  array{start_time: string, end_time: string, notes?: string|null}  $data
     *
     * @throws ValidationException
     */
    public function createBooking(User $user, Space $space, array $data): Booking
    {
        $timezone = config('coworking.timezone');
        $startTime = CarbonImmutable::parse($data['start_time'], $timezone);
        $endTime = CarbonImmutable::parse($data['end_time'], $timezone);

        return $this->schedule->withinLock($space->id, function (Space $space) use ($user, $startTime, $endTime, $data) {
            return Booking::create([
                'user_id' => $user->id,
                'space_id' => $space->id,
                'start_time' => $startTime->utc(),
                'end_time' => $endTime->utc(),
                'total_price' => $this->quote($space, $startTime, $endTime),
                'status' => Booking::STATUS_CONFIRMED,
                'notes' => $data['notes'] ?? null,
            ]);
        });
    }

    /**
     * Cancela uma reserva existente com verificação de autorização.
     *
     * @throws ValidationException
     */
    public function cancelBooking(Booking $booking, User $user, ?string $reason = null): Booking
    {
        return $this->schedule->withinLock($booking->space_id, function () use ($booking, $user, $reason) {
            $locked = Booking::query()->findOrFail($booking->id);
            if (! $locked->canBeCancelledBy($user)) {
                throw ValidationException::withMessages([
                    'booking' => ['Esta reserva não pode mais ser cancelada.'],
                ]);
            }

            $locked->update([
                'status' => Booking::STATUS_CANCELLED,
                'notes' => $reason
                    ? ($locked->notes ? "{$locked->notes} | Cancelamento: {$reason}" : "Cancelamento: {$reason}")
                    : $locked->notes,
            ]);

            return $locked;
        });
    }

    public function updateStatus(Booking $booking, string $status, ?string $notes): Booking
    {
        return $this->schedule->withinLock($booking->space_id, function (Space $space) use ($booking, $status, $notes) {
            $locked = Booking::query()->findOrFail($booking->id);

            if ($locked->status === Booking::STATUS_CANCELLED && $status !== Booking::STATUS_CANCELLED) {
                $this->validateNoOverlap($space, $locked->start_time, $locked->end_time, $locked->id);
            }

            $locked->update([
                'status' => $status,
                'notes' => $notes ?? $locked->notes,
            ]);

            return $locked;
        });
    }

    /**
     * Retorna métricas consolidadas para o Dashboard do Administrador.
     */
    /** @return array<string, mixed> */
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
