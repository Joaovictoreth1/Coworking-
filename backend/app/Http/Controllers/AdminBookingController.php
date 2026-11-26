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
        $filters = $request->validate([
            'page' => ['sometimes', 'integer', 'between:1,100000'],
            'per_page' => ['sometimes', 'integer', 'between:1,100'],
            'status' => ['sometimes', Rule::in(Booking::ALL_STATUSES)],
            'sort' => ['sometimes', Rule::in(['start_asc', 'start_desc'])],
            'space_id' => ['sometimes', 'integer', 'min:1'],
            'from_date' => ['sometimes', 'date_format:Y-m-d'],
            'to_date' => ['sometimes', 'date_format:Y-m-d', Rule::when($request->has('from_date'), 'after_or_equal:from_date')],
            'search' => ['nullable', 'string', 'max:120'],
        ]);
        $direction = ($filters['sort'] ?? null) === 'start_asc' ? 'asc' : 'desc';
        $query = Booking::query()
            ->with(['space', 'user'])
            ->orderBy('start_time', $direction)
            ->orderBy('id', $direction);

        if (isset($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (isset($filters['space_id'])) {
            $query->where('space_id', (int) $filters['space_id']);
        }

        if (isset($filters['from_date'])) {
            $query->where('start_time', '>=', $filters['from_date'].' 00:00:00');
        }

        if (isset($filters['to_date'])) {
            $query->where('end_time', '<=', $filters['to_date'].' 23:59:59');
        }

        if (isset($filters['search'])) {
            $term = '%'.$filters['search'].'%';
            $query->where(function ($q) use ($term) {
                $q->whereHas('user', fn ($uq) => $uq->where('name', 'like', $term)->orWhere('email', 'like', $term))
                  ->orWhereHas('space', fn ($sq) => $sq->where('name', 'like', $term));
            });
        }

        $bookings = $query->paginate((int) ($filters['per_page'] ?? 20))->withQueryString();

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
