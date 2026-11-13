<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreReservationRequest;
use App\Http\Resources\ReservationResource;
use App\Models\Reservation;
use App\Models\Space;
use App\Services\ReservationService;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ReservationController extends Controller
{
    public function __construct(private readonly ReservationService $reservations)
    {
    }

    /** Minhas reservas. Filtros opcionais: ?scope=upcoming|past e ?status=confirmed|cancelled. */
    public function index(Request $request): AnonymousResourceCollection
    {
        $data = $request->validate([
            'scope' => ['nullable', 'in:upcoming,past'],
            'status' => ['nullable', 'in:confirmed,cancelled'],
        ]);
        $scope = $data['scope'] ?? null;

        $list = $request->user()->reservations()
            ->with('space:id,name') // evita N+1 ao listar
            ->when($data['status'] ?? null, fn ($q, $status) => $q->where('status', $status))
            ->when($scope === 'upcoming', fn ($q) => $q->where('ends_at', '>', now())->orderBy('starts_at'))
            ->when($scope === 'past', fn ($q) => $q->where('ends_at', '<=', now())->orderByDesc('starts_at'))
            ->when($scope === null, fn ($q) => $q->orderByDesc('starts_at'))
            ->paginate(15)
            ->withQueryString();

        return ReservationResource::collection($list);
    }

    public function store(StoreReservationRequest $request, Space $space): JsonResponse
    {
        $reservation = $this->reservations->create(
            $space,
            $request->user(),
            $request->validated('rate'),
            $request->startsAt(),
            $request->endsAt(),
        );

        return (new ReservationResource($reservation->load('space:id,name')))
            ->additional(['message' => 'Reserva confirmada!'])
            ->response()
            ->setStatusCode(201);
    }

    public function destroy(Request $request, Reservation $reservation): JsonResponse
    {
        $user = $request->user();
        $space = $reservation->space()->first();

        // 404 (e não 403) para não revelar a existência de reservas alheias.
        abort_unless(
            $reservation->user_id === $user->id || ($space && $space->manageableBy($user)),
            404,
        );

        $cancelled = $this->reservations->cancel($reservation, $user);

        return (new ReservationResource($cancelled))
            ->additional(['message' => 'Reserva cancelada.'])
            ->response();
    }

    /** Horários ocupados e janela de funcionamento de um dia (público, sem dados pessoais). */
    public function availability(Request $request, Space $space): JsonResponse
    {
        abort_unless($space->is_active, 404);

        $data = $request->validate(['date' => ['required', 'date_format:Y-m-d']], [
            'date.required' => 'Informe a data (AAAA-MM-DD).',
            'date.date_format' => 'Informe a data no formato AAAA-MM-DD.',
        ]);

        $day = CarbonImmutable::createFromFormat('Y-m-d', $data['date'], config('coworking.timezone'))->startOfDay();
        $window = $this->reservations->windowFor($space, $day->dayOfWeek);

        return response()->json([
            'date' => $data['date'],
            'timezone' => config('coworking.timezone'),
            'open' => $window !== null,
            'window' => $window ? [
                'from' => sprintf('%02d:%02d', intdiv($window[0], 60), $window[0] % 60),
                'to' => sprintf('%02d:%02d', intdiv($window[1], 60) % 24, $window[1] % 60),
            ] : null,
            'busy' => $this->reservations->busyOn($space, $day)->map(fn (Reservation $r) => [
                'starts_at' => $r->starts_at->toIso8601String(),
                'ends_at' => $r->ends_at->toIso8601String(),
            ])->values(),
        ]);
    }

    /** Painel: reservas de um local (somente gestor ou admin). */
    public function forSpace(Request $request, Space $space): AnonymousResourceCollection
    {
        abort_unless($space->manageableBy($request->user()), 404);

        return ReservationResource::collection(
            $space->reservations()->with('user:id,name')->orderByDesc('starts_at')->paginate(20)
        );
    }
}
