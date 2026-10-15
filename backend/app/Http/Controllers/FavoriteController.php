<?php

namespace App\Http\Controllers;

use App\Http\Resources\SpaceResource;
use App\Models\Space;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class FavoriteController extends Controller
{
    /** Locais favoritados pelo usuário logado (mais recentes primeiro). Só os ativos aparecem. */
    public function index(Request $request): AnonymousResourceCollection
    {
        $user = $request->user();

        $spaces = $user->favoriteSpaces()
            ->with('photos')
            ->withStats($user)
            ->where('spaces.is_active', true)
            ->orderByDesc('favorites.created_at')
            ->paginate(15)
            ->withQueryString();

        return SpaceResource::collection($spaces);
    }

    public function store(Request $request, Space $space): JsonResponse
    {
        abort_unless($space->is_active, 404);

        // Favoritar duas vezes não duplica (índice único + syncWithoutDetaching)
        $request->user()->favoriteSpaces()->syncWithoutDetaching([$space->id]);

        return response()->json(['favorited' => true]);
    }

    public function destroy(Request $request, Space $space): JsonResponse
    {
        $request->user()->favoriteSpaces()->detach($space->id);

        return response()->json(['favorited' => false]);
    }
}
