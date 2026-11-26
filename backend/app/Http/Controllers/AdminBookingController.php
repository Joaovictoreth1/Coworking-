<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Resources\BookingResource;
use App\Models\Booking;
use App\Services\BookingService;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator as RequestValidator;

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
        $validator = Validator::make($request->all(), [
            'page' => ['sometimes', 'integer', 'between:1,100000'],
            'per_page' => ['sometimes', 'integer', 'between:1,100'],
            'status' => ['sometimes', Rule::in(Booking::ALL_STATUSES)],
            'sort' => ['sometimes', Rule::in(['start_asc', 'start_desc'])],
            'space_id' => ['sometimes', 'integer', 'min:1'],
            'from_date' => ['nullable', 'date'],
            'to_date' => ['nullable', 'date'],
            'search' => ['nullable', 'string', 'max:255'],
        ], [
            'status.in' => 'Status de filtro inválido.',
        ]);
        $validator->after(function (RequestValidator $validator): void {
            $dates = $validator->getData();
            if (isset($dates['from_date'], $dates['to_date'])
                && ! $validator->errors()->hasAny(['from_date', 'to_date'])
                && CarbonImmutable::parse($dates['to_date'])->toDateString() < CarbonImmutable::parse($dates['from_date'])->toDateString()
            ) {
                $validator->errors()->add('to_date', __('validation.after_or_equal', [
                    'attribute' => 'to_date',
                    'date' => 'from_date',
                ]));
            }
        });
        $filters = $validator->validate();
        $fromDate = isset($filters['from_date']) ? CarbonImmutable::parse($filters['from_date'])->toDateString() : null;
        $toDate = isset($filters['to_date']) ? CarbonImmutable::parse($filters['to_date'])->toDateString() : null;
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

        if ($fromDate !== null) {
            $query->where('start_time', '>=', $fromDate.' 00:00:00');
        }

        if ($toDate !== null) {
            $query->where('end_time', '<', CarbonImmutable::parse($toDate)->addDay()->toDateTimeString());
        }

        if (isset($filters['search'])) {
            $term = '%'.strtr(trim($filters['search']), ['!' => '!!', '%' => '!%', '_' => '!_']).'%';
            $query->where(function ($q) use ($term) {
                $q->whereHas('user', fn ($uq) => $uq->whereRaw("name like ? escape '!'", [$term])
                    ->orWhereRaw("email like ? escape '!'", [$term]))
                    ->orWhereHas('space', fn ($sq) => $sq->whereRaw("name like ? escape '!'", [$term]));
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
        ], [
            'status.required' => 'O novo status da reserva é obrigatório.',
            'status.in' => 'Status da reserva inválido.',
            'notes.max' => 'As observações não podem exceder 1000 caracteres.',
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
