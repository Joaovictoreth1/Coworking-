<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\StoreBookingRequest;
use App\Http\Resources\BookingResource;
use App\Models\Booking;
use App\Models\Space;
use App\Services\BookingService;
use Carbon\CarbonImmutable;
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
        $filters = $request->validate([
            'page' => ['sometimes', 'integer', 'between:1,100000'],
            'per_page' => ['sometimes', 'integer', 'between:1,100'],
            'status' => ['sometimes', Rule::in(Booking::ALL_STATUSES)],
            'sort' => ['sometimes', Rule::in(['start_asc', 'start_desc'])],
        ]);
        $direction = ($filters['sort'] ?? null) === 'start_asc' ? 'asc' : 'desc';
        $query = $this->authenticatedUser($request)
            ->bookings()
            ->with(['space', 'user'])
            ->orderBy('start_time', $direction)
            ->orderBy('id', $direction);

        if (isset($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        $bookings = $query->paginate((int) ($filters['per_page'] ?? 15))->withQueryString();

        return BookingResource::collection($bookings);
    }

    /**
     * Cria uma nova reserva para um espaço.
     */
    public function store(StoreBookingRequest $request, Space $space): JsonResponse
    {
        $booking = $this->bookingService->createBooking(
            $this->authenticatedUser($request),
            $space,
            [
                'start_time' => $request->validated('start_time'),
                'end_time' => $request->validated('end_time'),
                'notes' => $request->validated('notes'),
            ]
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
        $user = $this->authenticatedUser($request);

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
        $payload = $request->validate(['reason' => ['nullable', 'string', 'max:1000']]);
        $updated = $this->bookingService->cancelBooking($booking, $this->authenticatedUser($request), $payload['reason'] ?? null);
        $updated->load(['space', 'user']);

        return response()->json([
            'message' => 'Reserva cancelada com sucesso.',
            'booking' => new BookingResource($updated),
        ]);
    }

    /**
     * Prévia em tempo real de disponibilidade e valor estimado.
     */
    public function preview(StoreBookingRequest $request, Space $space): JsonResponse
    {
        $startTime = CarbonImmutable::parse($request->validated('start_time'));
        $endTime = CarbonImmutable::parse($request->validated('end_time'));

        try {
            $price = $this->bookingService->quote($space, $startTime, $endTime);

            return response()->json([
                'available' => true,
                'total_price' => $price,
                'duration_hours' => (int) ceil($startTime->diffInMinutes($endTime) / 60),
                'message' => 'Horário disponível para reserva.',
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'available' => false,
                'total_price' => 0.00,
                'errors' => $e->errors(),
                'message' => $e->getMessage(),
            ], 422);
        }
    }
}
