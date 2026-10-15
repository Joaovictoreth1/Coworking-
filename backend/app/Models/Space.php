<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Space extends Model
{
    public const MAX_PHOTOS = 10;

    protected $fillable = [
        'user_id',
        'name',
        'description',
        'capacity',
        'zip_code',
        'street',
        'number',
        'complement',
        'neighborhood',
        'city',
        'state',
        'hourly_price',
        'daily_price',
        'monthly_price',
        'is_free',
        'opening_hours',
        'availability',
        'amenities',
        'is_active',
    ];

    protected function casts(): array
    {
        // Os preços ficam sem cast de propósito: o resource converte para float (e null continua null).
        return [
            'capacity' => 'integer',
            'opening_hours' => 'array',
            'availability' => 'array',
            'amenities' => 'array',
            'is_active' => 'boolean',
            'is_free' => 'boolean',
        ];
    }

    /** Busca por nome, rua, bairro ou cidade. */
    public function scopeSearch(Builder $query, ?string $term): Builder
    {
        $term = trim((string) $term);
        if ($term === '') {
            return $query;
        }

        $like = '%'.addcslashes($term, '%_\\').'%';

        return $query->where(function (Builder $where) use ($like) {
            $where->where('name', 'like', $like)
                ->orWhere('street', 'like', $like)
                ->orWhere('neighborhood', 'like', $like)
                ->orWhere('city', 'like', $like);
        });
    }

    /** Nota média, total de avaliações e (se houver usuário) se ele favoritou o local. */
    public function scopeWithStats(Builder $query, ?User $user = null): Builder
    {
        $query->withAvg('reviews', 'rating')->withCount('reviews');

        if ($user) {
            $query->withExists(['favoritedBy as is_favorite' => fn (Builder $q) => $q->where('users.id', $user->id)]);
        }

        return $query;
    }

    /**
     * Filtro de preço.
     * $type: free | hourly | daily | monthly (outro valor/nulo = qualquer modalidade).
     * $min/$max valem para a modalidade escolhida ou, sem modalidade, para qualquer uma delas.
     */
    public function scopePriceFilter(Builder $query, ?string $type, ?float $min, ?float $max): Builder
    {
        if ($type === 'free') {
            return $query->where('is_free', true);
        }

        $column = match ($type) {
            'hourly' => 'hourly_price',
            'daily' => 'daily_price',
            'monthly' => 'monthly_price',
            default => null,
        };

        if ($column) {
            $query->whereNotNull($column);
        }

        if ($min === null && $max === null) {
            return $query;
        }

        $columns = $column ? [$column] : ['hourly_price', 'daily_price', 'monthly_price'];

        return $query->where(function (Builder $where) use ($columns, $column, $min, $max) {
            foreach ($columns as $col) {
                $where->orWhere(function (Builder $range) use ($col, $min, $max) {
                    if ($min !== null) {
                        $range->where($col, '>=', $min);
                    }
                    if ($max !== null) {
                        $range->where($col, '<=', $max);
                    }
                });
            }

            // Sem modalidade escolhida, locais gratuitos (R$ 0) entram em faixas que começam em zero.
            if (! $column && ($min === null || $min <= 0)) {
                $where->orWhere('is_free', true);
            }
        });
    }

    /** Ordena pelo menor preço (gratuitos primeiro) ou pelo preço da modalidade escolhida. */
    public function scopeOrderByPrice(Builder $query, string $direction, ?string $type = null): Builder
    {
        $direction = $direction === 'desc' ? 'desc' : 'asc';

        $column = match ($type) {
            'hourly' => 'hourly_price',
            'daily' => 'daily_price',
            'monthly' => 'monthly_price',
            default => null,
        };

        if ($column) {
            return $query->orderBy($column, $direction);
        }

        $least = $query->getConnection()->getDriverName() === 'sqlite' ? 'min' : 'least';
        $big = '1000000000';

        return $query->orderByRaw(
            "case when is_free then 0 else $least(coalesce(hourly_price, $big), coalesce(daily_price, $big), coalesce(monthly_price, $big)) end $direction"
        );
    }

    /** Admin gerencia todos os locais; os demais usuários, só os próprios. */
    public function manageableBy(User $user): bool
    {
        return $user->isAdmin() || $this->user_id === $user->id;
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(SpaceReview::class);
    }

    public function favoritedBy(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'favorites')->withTimestamps();
    }

    public function photos(): HasMany
    {
        return $this->hasMany(SpacePhoto::class)->orderBy('position')->orderBy('id');
    }
}
