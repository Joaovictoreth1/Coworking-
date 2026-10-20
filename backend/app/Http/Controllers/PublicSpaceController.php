<?php

namespace App\Http\Controllers;

use App\Http\Resources\SpaceResource;
use App\Models\Space;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PublicSpaceController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        // 1. Validação centralizada e segura dos parâmetros da URL
        $validated = $request->validate([
            'q'          => ['nullable', 'string', 'max:255'],
            'price_type' => ['nullable', 'in:free,hourly,daily,monthly'],
            'min_price'  => ['nullable', 'numeric', 'min:0'],
            'max_price'  => ['nullable', 'numeric', 'min:0'],
            'sort'       => ['nullable', 'in:price_asc,price_desc,rating'],
        ]);

        $user = $request->user();
        $type = $validated['price_type'] ?? null;
        
        $min = isset($validated['min_price']) ? (float) $validated['min_price'] : null;
        $max = isset($validated['max_price']) ? (float) $validated['max_price'] : null;

        // Inverte os valores se o mínimo for maior que o máximo
        if ($min !== null && $max !== null && $min > $max) {
            [$min, $max] = [$max, $min];
        }

        // 2. Construção da query limpa
        $query = Space::query()
            ->with('photos')
            ->withStats($user)
            ->where('is_active', true)
            ->search($validated['q'] ?? null)
            ->priceFilter($type, $min, $max);

        // 3. Aplicação da ordenação
        match ($validated['sort'] ?? null) {
            'price_asc'  => $query->orderByPrice('asc', $type)->latest('id'),
            'price_desc' => $query->orderByPrice('desc', $type)->latest('id'),
            'rating'     => $query->orderByRaw('reviews_avg_rating is null')
                                  ->orderByDesc('reviews_avg_rating')
                                  ->orderByDesc('reviews_count')
                                  ->latest('id'),
            default      => $query->latest('id'),
        };

        return SpaceResource::collection($query->paginate(15)->withQueryString());
    }

    public function show(Request $request, Space $space): SpaceResource
    {
        abort_unless($space->is_active, 404);

        // 4. Encadeamento fluente para carregar relações e agregados
        $space->load('photos')
              ->loadAvg('reviews', 'rating')
              ->loadCount('reviews');

        if ($user = $request->user()) {
            $space->loadExists([
                'favoritedBy as is_favorite' => fn ($q) => $q->where('users.id', $user->id)
            ]);
        }

        return new SpaceResource($space);
    }
}
