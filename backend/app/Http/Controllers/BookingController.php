<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\StoreBookingRequest;
use App\Http\Resources\BookingResource;
use App\Models\Booking;
use App\Models\Space;
use App\Services\BookingService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class BookingController extends Controller
{
    public function __construct(
        protected BookingService $bookingService
    ) {}

    /**
     * Lista as reservas do usuário autenticado.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $validated = $request->validate([
            'status' => ['nullable', 'string', Rule::in(Booking::ALL_STATUSES)],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ], [
            'status.in' => 'Status de filtro inválido.',
        ]);

        $query = $request->user()
            ->bookings()
            ->with(['space', 'user'])
            ->latest('start_time');

        if (! empty($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        $perPage = (int) ($validated['per_page'] ?? 15);
        $bookings = $query->paginate($perPage);

        return BookingResource::collection($bookings);
    }

    /**
     * Cria uma nova reserva para um espaço.
     */
    public function store(StoreBookingRequest $request, Space $space): JsonResponse
    {
        $booking = $this->bookingService->createBooking(
            $request->user(),
            $space,
            $request->validated()
        );

        $booking->load(['space', 'user']);

        return (new BookingResource($booking))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Exibe os detalhes de uma reserva específica.
     */
    public function show(Request $request, Booking $booking): BookingResource
    {
        $user = $request->user();

        if (! $user->isAdmin() && $booking->user_id !== $user->id) {
            abort(403, 'Acesso não autorizado a esta reserva.');
        }

        $booking->load(['space', 'user']);

        return new BookingResource($booking);
    }

    /**
     * Cancela uma reserva existente.
     */
    public function cancel(Request $request, Booking $booking): JsonResponse
    {
        $validated = $request->validate([
            'reason' => ['nullable', 'string', 'max:500'],
        ], [
            'reason.string' => 'O motivo do cancelamento deve ser um texto válido.',
            'reason.max' => 'O motivo do cancelamento não pode exceder 500 caracteres.',
        ]);

        $reason = $validated['reason'] ?? null;
        $updated = $this->bookingService->cancelBooking($booking, $request->user(), $reason);
        $updated->load(['space', 'user']);

        return response()->json([
            'message' => 'Reserva cancelada com sucesso.',
            'booking' => new BookingResource($updated),
        ]);
    }

    /**
     * Prévia em tempo real de disponibilidade e valor estimado.
     */
    public function preview(Request $request, Space $space): JsonResponse
    {
        $validated = $request->validate([
            'start_time' => ['required', 'date', 'after_or_equal:now'],
            'end_time' => ['required', 'date', 'after:start_time'],
        ], [
            'start_time.required' => 'O horário de início da reserva é obrigatório.',
            'start_time.date' => 'O horário de início deve ser uma data válida.',
            'start_time.after_or_equal' => 'O horário de início não pode ser no passado.',
            'end_time.required' => 'O horário de término da reserva é obrigatório.',
            'end_time.date' => 'O horário de término deve ser uma data válida.',
            'end_time.after' => 'O horário de término deve ser posterior ao horário de início.',
        ]);

        if (! $space->is_active) {
            return response()->json([
                'available' => false,
                'total_price' => 0.00,
                'errors' => ['space_id' => ['Este espaço está temporariamente inativo para reservas.']],
                'message' => 'Este espaço está temporariamente inativo para reservas.',
            ], 422);
        }

        $startTime = Carbon::parse($validated['start_time']);
        $endTime = Carbon::parse($validated['end_time']);

        try {
            $this->bookingService->validateNotInPast($startTime);
            $this->bookingService->validateWorkingHours($space, $startTime, $endTime);
            $this->bookingService->validateNoOverlap($space, $startTime, $endTime);
            $price = $this->bookingService->calculateTotalPrice($space, $startTime, $endTime);

            return response()->json([
                'available' => true,
                'total_price' => $price,
                'duration_hours' => (int) ceil($startTime->diffInMinutes($endTime) / 60),
                'message' => 'Horário disponível para reserva.',
            ]);
        } catch (ValidationException $e) {
            $firstMessage = collect($e->errors())->flatten()->first() ?? $e->getMessage();

            return response()->json([
                'available' => false,
                'total_price' => 0.00,
                'errors' => $e->errors(),
                'message' => $firstMessage,
            ], 422);
        }
    }
}
