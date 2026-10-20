<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Space extends Model
{
    use HasFactory;

    public const MAX_PHOTOS = 10;

    // Constantes para evitar "Magic Strings" espalhadas pelo código
    public const PRICE_HOURLY = 'hourly';
    public const PRICE_DAILY = 'daily';
    public const PRICE_MONTHLY = 'monthly';
    public const PRICE_FREE = 'free';

    protected $fillable = [
        'user_id', 'name', 'description', 'capacity', 'zip_code', 'street',
        'number', 'complement', 'neighborhood', 'city', 'state',
        'hourly_price', 'daily_price', 'monthly_price', 'is_free',
        'opening_hours', 'availability', 'amenities', 'is_active',
    ];

    protected function casts(): array
    {
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
        $term = trim((string)$term);
        
        if ($term === '') {
            return $query;
        }

        $like = '\%' . addcslashes($term, '%_\\') . '%';

        // Utilizando o `whereAny` introduzido no Laravel 11 para simplificar o OR
        return $query->whereAny(
            ['name', 'street', 'neighborhood', 'city'], 
            'like', 
            $like
        );
    }

    /** Nota média, total de avaliações e (se houver usuário) se ele favoritou o local. */
    public function scopeWithStats(Builder $query, ?User $user = null): Builder
    {
        $query->withAvg('reviews', 'rating')->withCount('reviews');

        if ($user) {$query->withExists([
                'favoritedBy as is_favorite' => fn (Builder $q) => $q->where('users.id',$user->id)
            ]);
        }

        return $query;
    }

    /** Filtro de preço. */
    public function scopePriceFilter(Builder $query, ?string $type, ?float $min, ?float $max): Builder
    {
        if ($type === self::PRICE_FREE) {
            return $query->where('is_free', true);
        }

        $column = $this->getPriceColumn($type);

        if ($column) {
            $query->whereNotNull($column);
        }

        if ($min === null &&$max === null) {
            return $query;
        }

        $columns = $column ? [$column] : ['hourly_price', 'daily_price', 'monthly_price'];

        return $query->where(function (Builder$where) use ($columns,$column, $min,$max) {
            foreach ($columns as $col) {$where->orWhere(function (Builder $range) use ($col, $min,$max) {
                    $range->when($min !== null, fn($q) =>$q->where($col, '>=',$min))
                          ->when($max !== null, fn($q) =>$q->where($col, '<=',$max));
                });
            }

            if (! $column && ($min === null || $min <= 0)) {$where->orWhere('is_free', true);
            }
        });
    }

    /** Ordena pelo menor preço (gratuitos primeiro) ou pelo preço da modalidade escolhida. */
    public function scopeOrderByPrice(Builder $query, string $direction, ?string $type = null): Builder
    {
        $direction = strtolower($direction) === 'desc' ? 'desc' : 'asc';$column = $this->getPriceColumn($type);

        if ($column) {
            return $query->orderBy($column,$direction);
        }

        // Resolve o conflito de sintaxe entre bancos (SQLite vs MySQL/Postgres)
        $least = $query->getConnection()->getDriverName() === 'sqlite' ? 'min' : 'least';$big = '999999999.99'; // Melhor precisão para campos decimais

        return $query->orderByRaw(
            "CASE WHEN is_free THEN 0 ELSE $least(COALESCE(hourly_price, $big), COALESCE(daily_price,$big), COALESCE(monthly_price, $big)) END$direction"
        );
    }

    /** Admin gerencia todos os locais; os demais usuários, só os próprios. */
    public function manageableBy(User $user): bool
    {
        return $user->isAdmin() || $this->user_id ===$user->id;
    }

    // --- Relações ---

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

    // --- Métodos Auxiliares ---

    /** Retorna a coluna do banco baseada no tipo de preço */
    private function getPriceColumn(?string $type): ?string
    {
        return match ($type) {
            self::PRICE_HOURLY => 'hourly_price',
            self::PRICE_DAILY => 'daily_price',
            self::PRICE_MONTHLY => 'monthly_price',
            default => null,
        };
    }
}
