<?php

namespace App\Http\Controllers;

use App\Http\Requests\SpaceRequest;
use App\Http\Resources\SpaceResource;
use App\Models\Booking;
use App\Models\Space;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class SpaceController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:150'],
            'status' => ['nullable', 'string', Rule::in(['active', 'inactive'])],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $user = $request->user();
        $query = Space::query()->with(['photos', 'user'])->withStats($user)->latest('id');

        if (! $user->isAdmin()) {
            $query->where('user_id', $user->id);
        }

        $query->search($validated['q'] ?? null);

        match ($validated['status'] ?? null) {
            'active' => $query->where('is_active', true),
            'inactive' => $query->where('is_active', false),
            default => null,
        };

        $perPage = (int) ($validated['per_page'] ?? 10);

        return SpaceResource::collection($query->paginate($perPage)->withQueryString());
    }

    public function store(SpaceRequest $request): JsonResponse
    {
        if (! $request->user()->isAdmin()) {
            abort(403, 'Acesso restrito a administradores.');
        }

        $space = Space::create([
            ...$request->validated(),
            'user_id' => $request->user()->id,
        ]);

        return (new SpaceResource($space->load('photos')))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Request $request, Space $space): SpaceResource
    {
        $this->authorizeSpace($request, $space);

        return new SpaceResource($space->load('photos'));
    }

    public function update(SpaceRequest $request, Space $space): SpaceResource
    {
        $this->authorizeSpace($request, $space);
        $data = $request->validated();

        $addressFields = ['street', 'number', 'city', 'state'];
        $addressChanged = false;
        foreach ($addressFields as $field) {
            if (array_key_exists($field, $data) && (string) ($data[$field] ?? '') !== (string) ($space->{$field} ?? '')) {
                $addressChanged = true;
                break;
            }
        }

        if ($addressChanged) {
            $hasNewLat = array_key_exists('latitude', $data) && $data['latitude'] !== null
                && (float) $data['latitude'] !== (float) $space->latitude;
            $hasNewLng = array_key_exists('longitude', $data) && $data['longitude'] !== null
                && (float) $data['longitude'] !== (float) $space->longitude;

            if (! $hasNewLat && ! $hasNewLng) {
                $data['latitude'] = null;
                $data['longitude'] = null;
            }
        }

        $space->update($data);

        return new SpaceResource($space->load('photos'));
    }

    public function destroy(Request $request, Space $space): JsonResponse
    {
        $this->authorizeSpace($request, $space);

        $hasActiveFutureBookings = $space->bookings()
            ->whereIn('status', [Booking::STATUS_PENDING, Booking::STATUS_CONFIRMED])
            ->where('end_time', '>', now()->utc())
            ->exists();

        if ($hasActiveFutureBookings) {
            throw ValidationException::withMessages([
                'space' => ['Não é possível excluir um local com reservas ativas futuras. Desative o local ou cancele as reservas primeiro.'],
            ]);
        }

        // Guarda os caminhos e apaga do disco somente após confirmar a exclusão no banco.
        $photoPaths = $space->photos()->pluck('path')->all();

        $space->delete();

        foreach ($photoPaths as $path) {
            Storage::disk('public')->delete($path);
        }

        return response()->json(['message' => 'Local excluído.']);
    }

    private function authorizeSpace(Request $request, Space $space): void
    {
        // 404 (e não 403) para não revelar que o local existe
        abort_unless($space->manageableBy($request->user()), 404);
    }
}
