<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\UpdateBookingStatusRequest;
use App\Http\Resources\BookingResource;
use App\Models\Booking;
use App\Services\BookingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

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

        $status = $request->query('status');
        if (is_string($status) && in_array($status, Booking::ALL_STATUSES, true)) {
            $query->where('status', $status);
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
            $escaped = addcslashes((string) $request->query('search'), '%_\\');
            $term = "%{$escaped}%";
            $query->where(function ($q) use ($term) {
                $q->whereHas('user', fn ($uq) => $uq->where('name', 'like', $term)->orWhere('email', 'like', $term))
                    ->orWhereHas('space', fn ($sq) => $sq->where('name', 'like', $term));
            });
        }

        $perPage = max(1, min(100, (int) $request->query('per_page', 20)));
        $bookings = $query->paginate($perPage);

        return BookingResource::collection($bookings);
    }

    /**
     * Atualiza o status de uma reserva (ex: aprovar, cancelar, concluir).
     */
    public function updateStatus(UpdateBookingStatusRequest $request, Booking $booking): JsonResponse
    {
        $validated = $request->validated();

        $updated = $this->bookingService->updateBookingStatus(
            $booking,
            $validated['status'],
            $validated['notes'] ?? null,
        );

        $updated->load(['space', 'user']);

        return response()->json([
            'message' => 'Status da reserva atualizado com sucesso.',
            'booking' => new BookingResource($updated),
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
