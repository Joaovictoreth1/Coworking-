<?php

namespace App\Http\Controllers;

use App\Http\Requests\SpaceRequest;
use App\Http\Resources\SpaceResource;
use App\Models\Space;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Storage;

class SpaceController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $user = $request->user();
        $query = Space::query()->with(['photos', 'user'])->withStats($user)->latest('id');

        if (! $user->isAdmin()) {
            $query->where('user_id', $user->id);
        }

        $query->search($request->query('q'));

        match ($request->query('status')) {
            'active' => $query->where('is_active', true),
            'inactive' => $query->where('is_active', false),
            default => null,
        };

        return SpaceResource::collection($query->paginate(10)->withQueryString());
    }

    public function store(SpaceRequest $request): JsonResponse
    {
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
        $space->update($request->validated());

        return new SpaceResource($space->load('photos'));
    }

    public function destroy(Request $request, Space $space): JsonResponse
    {
        $this->authorizeSpace($request, $space);

        // Os registros das fotos caem em cascata; os arquivos precisam ser apagados à mão.
        foreach ($space->photos as $photo) {
            Storage::disk('public')->delete($photo->path);
        }

        $space->delete();

        return response()->json(['message' => 'Local excluído.']);
    }

    private function authorizeSpace(Request $request, Space $space): void
    {
        // 404 (e não 403) para não revelar que o local existe
        abort_unless($space->manageableBy($request->user()), 404);
    }
}
