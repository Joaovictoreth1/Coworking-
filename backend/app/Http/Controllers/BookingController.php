<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Exceptions\BookingConflictException;
use App\Http\Requests\CancelBookingRequest;
use App\Http\Requests\PreviewBookingRequest;
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
    public function cancel(CancelBookingRequest $request, Booking $booking): JsonResponse
    {
        $reason = $request->validated('reason');
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
    public function preview(PreviewBookingRequest $request, Space $space): JsonResponse
    {
        if (! $space->is_active) {
            return response()->json([
                'available' => false,
                'conflict' => false,
                'total_price' => 0.00,
                'errors' => ['space_id' => ['Este espaço está temporariamente inativo para reservas.']],
                'message' => 'Este espaço está temporariamente inativo para reservas.',
            ], 422);
        }

        $startTime = Carbon::parse($request->validated('start_time'));
        $endTime = Carbon::parse($request->validated('end_time'));

        try {
            $this->bookingService->validateNotInPast($startTime);
            $this->bookingService->validateWorkingHours($space, $startTime, $endTime);
            $this->bookingService->validateNoOverlap($space, $startTime, $endTime);
            $price = $this->bookingService->calculateTotalPrice($space, $startTime, $endTime);

            return response()->json([
                'available' => true,
                'conflict' => false,
                'total_price' => $price,
                'duration_hours' => (int) ceil($startTime->diffInMinutes($endTime) / 60),
                'message' => 'Horário disponível para reserva.',
            ]);
        } catch (BookingConflictException $e) {
            return response()->json([
                'available' => false,
                'conflict' => true,
                'total_price' => 0.00,
                'errors' => $e->errors,
                'message' => $e->getMessage(),
            ], 409);
        } catch (ValidationException $e) {
            $firstMessage = collect($e->errors())->flatten()->first() ?? $e->getMessage();

            return response()->json([
                'available' => false,
                'conflict' => false,
                'total_price' => 0.00,
                'errors' => $e->errors(),
                'message' => $firstMessage,
            ], 422);
        }
    }
}
