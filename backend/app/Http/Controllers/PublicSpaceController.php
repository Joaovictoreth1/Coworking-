<?php

namespace App\Http\Controllers;

use App\Http\Resources\SpaceResource;
use App\Models\Space;
use Illuminate\Http\Request;aaaaa
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PublicSpaceController extends Controller
{
    private const PRICE_TYPES = ['free', 'hourly', 'daily', 'monthly'];

    public function index(Request $request): AnonymousResourceCollection
    {
        $user = $request->user(); // só existe com token válido (rota usa "auth.token:optional")

        $type = in_array($request->query('price_type'), self::PRICE_TYPES, true)
            ? $request->query('price_type')
            : null;

        $min = $this->money($request->query('min_price'));
        $max = $this->money($request->query('max_price'));
        if ($min !== null && $max !== null && $min > $max) {
            [$min, $max] = [$max, $min];
        }

        $query = Space::query()
            ->with('photos')
            ->withStats($user)
            ->where('is_active', true)
            ->search($request->query('q'))
            ->priceFilter($type, $min, $max);

        match ($request->query('sort')) {
            'price_asc' => $query->orderByPrice('asc', $type)->latest('id'),
            'price_desc' => $query->orderByPrice('desc', $type)->latest('id'),
            'rating' => $query->orderByRaw('reviews_avg_rating is null')
                ->orderByDesc('reviews_avg_rating')
                ->orderByDesc('reviews_count')
                ->latest('id'),
            default => $query->latest('id'),
        };

        return SpaceResource::collection($query->paginate(15)->withQueryString());
    }

    public function show(Request $request, Space $space): SpaceResource
    {
        abort_unless($space->is_active, 404);

        $space->loadMissing('photos');
        $space->loadAvg('reviews', 'rating')->loadCount('reviews');

        if ($user = $request->user()) {
            $space->loadExists(['favoritedBy as is_favorite' => fn ($q) => $q->where('users.id', $user->id)]);
        }

        return new SpaceResource($space);
    }

    private function money(mixed $value): ?float
    {
        return is_numeric($value) && (float) $value >= 0 ? (float) $value : null;
    }
}
