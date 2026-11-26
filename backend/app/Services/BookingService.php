<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Booking;
use App\Models\Space;
use App\Models\User;
use Carbon\Carbon;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class BookingService
{
    /**
     * Valida se não há sobreposição de horário (Double-Booking).
     *
     * @throws ValidationException
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
            throw ValidationException::withMessages([
                'booking_conflict' => ['Este espaço já possui uma reserva no horário selecionado. Escolha outro intervalo.'],
                'start_time' => ['Horário conflitante com outra reserva ativa.'],
            ]);
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
     * Cria uma nova reserva garantindo concorrência segura (transação + bloqueio).
     *
     * @throws ValidationException
     */
    public function createBooking(User $user, Space $space, array $data): Booking
    {
        $startTime = Carbon::parse($data['start_time']);
        $endTime = Carbon::parse($data['end_time']);

        $startUtc = $startTime->copy()->utc();
        $endUtc = $endTime->copy()->utc();

        return DB::transaction(function () use ($user, $space, $startTime, $endTime, $startUtc, $endUtc, $data) {
            $space = Space::query()->whereKey($space->id)->lockForUpdate()->first();
            if (! $space || ! $space->is_active) {
                throw ValidationException::withMessages([
                    'space_id' => ['Este espaço está temporariamente inativo para reservas.'],
                ]);
            }
            $this->validateNotInPast($startUtc);
            $this->validateWorkingHours($space, $startTime, $endTime);
            $this->validateNoOverlap($space, $startUtc, $endUtc);

            $totalPrice = $this->calculateTotalPrice($space, $startUtc, $endUtc);

            return Booking::create([
                'user_id' => $user->id,
                'space_id' => $space->id,
                'start_time' => $startUtc,
                'end_time' => $endUtc,
                'total_price' => $totalPrice,
                'status' => Booking::STATUS_CONFIRMED,
                'notes' => $data['notes'] ?? null,
            ]);
        }, 3);
    }

    public function updateStatus(Booking $booking, string $status, ?string $notes): Booking
    {
        return DB::transaction(function () use ($booking, $status, $notes) {
            $space = Space::query()->whereKey($booking->space_id)->lockForUpdate()->firstOrFail();
            $booking = Booking::query()->whereKey($booking->id)->lockForUpdate()->firstOrFail();

            if ($booking->status === Booking::STATUS_CANCELLED && $status !== Booking::STATUS_CANCELLED) {
                $this->validateNoOverlap($space, $booking->start_time, $booking->end_time, $booking->id);
            }

            $booking->update(['status' => $status, 'notes' => $notes ?? $booking->notes]);

            return $booking;
        }, 3);
    }

    /**
     * Cancela uma reserva existente com verificação de autorização.
     *
     * @throws ValidationException
     */
    public function cancelBooking(Booking $booking, User $user, ?string $reason = null): Booking
    {
        if (! $user->isAdmin() && $booking->user_id !== $user->id) {
            abort(403, 'Você não tem permissão para cancelar esta reserva.');
        }

        if ($booking->status === Booking::STATUS_CANCELLED || $booking->status === Booking::STATUS_COMPLETED) {
            throw ValidationException::withMessages([
                'booking' => ['Esta reserva não pode mais ser cancelada.'],
            ]);
        }

        $booking->update([
            'status' => Booking::STATUS_CANCELLED,
            'notes' => $reason
                ? ($booking->notes ? "{$booking->notes} | Cancelamento: {$reason}" : "Cancelamento: {$reason}")
                : $booking->notes,
        ]);

        return $booking;
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
