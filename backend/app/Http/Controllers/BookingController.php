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
        $query = $request->user()
            ->bookings()
            ->with(['space', 'user'])
            ->latest('start_time');

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }

        $bookings = $query->paginate((int) $request->query('per_page', 15));

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
        $reason = $request->input('reason');
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
        $request->validate([
            'start_time' => ['required', 'date'],
            'end_time' => ['required', 'date', 'after:start_time'],
        ]);

        $startTime = Carbon::parse($request->input('start_time'));
        $endTime = Carbon::parse($request->input('end_time'));

        try {
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
            return response()->json([
                'available' => false,
                'total_price' => 0.00,
                'errors' => $e->errors(),
                'message' => current(current($e->errors())),
            ], 422);
        }
    }
}
