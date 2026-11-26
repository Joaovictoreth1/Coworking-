<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Resources\BookingResource;
use App\Models\Booking;
use App\Services\BookingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class AdminBookingController extends Controller
{
    public function __construct(
        protected BookingService $bookingService
    ) {}

    /**
     * Lista todas as reservas do sistema com filtros administrativos.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Booking::query()
            ->with(['space', 'user'])
            ->latest('start_time');

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }

        if ($request->filled('space_id')) {
            $query->where('space_id', (int) $request->query('space_id'));
        }

        if ($request->filled('from_date')) {
            $query->whereDate('start_time', '>=', $request->query('from_date'));
        }

        if ($request->filled('to_date')) {
            $query->whereDate('end_time', '<=', $request->query('to_date'));
        }

        if ($request->filled('search')) {
            $term = '%' . $request->query('search') . '%';
            $query->where(function ($q) use ($term) {
                $q->whereHas('user', fn ($uq) => $uq->where('name', 'like', $term)->orWhere('email', 'like', $term))
                  ->orWhereHas('space', fn ($sq) => $sq->where('name', 'like', $term));
            });
        }

        $bookings = $query->paginate((int) $request->query('per_page', 20));

        return BookingResource::collection($bookings);
    }

    /**
     * Atualiza o status de uma reserva (ex: aprovar, cancelar, concluir).
     */
    public function updateStatus(Request $request, Booking $booking): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'string', Rule::in(Booking::ALL_STATUSES)],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $booking = $this->bookingService->updateStatus($booking, $validated['status'], $validated['notes'] ?? null);
        $booking->load(['space', 'user']);

        return response()->json([
            'message' => 'Status da reserva atualizado com sucesso.',
            'booking' => new BookingResource($booking),
        ]);
    }

    /**
     * Retorna indicadores e métricas do sistema para o Dashboard.
     */
    public function metrics(): JsonResponse
    {
        $metrics = $this->bookingService->getAdminMetrics();

        return response()->json($metrics);
    }
}
