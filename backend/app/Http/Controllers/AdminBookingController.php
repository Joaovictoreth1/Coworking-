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
        $validated = $request->validate([
            'status' => ['nullable', 'string', Rule::in(Booking::ALL_STATUSES)],
            'space_id' => ['nullable', 'integer', 'min:1'],
            'from_date' => ['nullable', 'date'],
            'to_date' => ['nullable', 'date'],
            'search' => ['nullable', 'string', 'max:255'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ], [
            'status.in' => 'Status de filtro inválido.',
        ]);

        $query = Booking::query()
            ->with(['space', 'user'])
            ->latest('start_time');

        if (! empty($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        if (! empty($validated['space_id'])) {
            $query->where('space_id', (int) $validated['space_id']);
        }

        if (! empty($validated['from_date'])) {
            $query->whereDate('start_time', '>=', $validated['from_date']);
        }

        if (! empty($validated['to_date'])) {
            $query->whereDate('end_time', '<=', $validated['to_date']);
        }

        if (! empty($validated['search'])) {
            $term = '%'.addcslashes(trim($validated['search']), '%_\\').'%';
            $query->where(function ($q) use ($term) {
                $q->whereHas('user', fn ($uq) => $uq->where('name', 'like', $term)->orWhere('email', 'like', $term))
                    ->orWhereHas('space', fn ($sq) => $sq->where('name', 'like', $term));
            });
        }

        $perPage = (int) ($validated['per_page'] ?? 20);
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
