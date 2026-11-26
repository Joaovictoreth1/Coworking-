<?php

declare(strict_types=1);

namespace App\Models;

use Carbon\CarbonInterface;
use Database\Factories\BookingFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property Carbon $start_time
 * @property Carbon $end_time
 */
class Booking extends Model
{
    /** @use HasFactory<BookingFactory> */
    /** @use HasFactory<BookingFactory> */
    use HasFactory;

    public const STATUS_PENDING = 'pending';

    public const STATUS_CONFIRMED = 'confirmed';

    public const STATUS_CANCELLED = 'cancelled';

    public const STATUS_COMPLETED = 'completed';

    public const ALL_STATUSES = [
        self::STATUS_PENDING,
        self::STATUS_CONFIRMED,
        self::STATUS_CANCELLED,
        self::STATUS_COMPLETED,
    ];

    protected $fillable = [
        'user_id',
        'space_id',
        'start_time',
        'end_time',
        'total_price',
        'status',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'start_time' => 'datetime',
            'end_time' => 'datetime',
            'total_price' => 'decimal:2',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return BelongsTo<Space, $this> */
    public function space(): BelongsTo
    {
        return $this->belongsTo(Space::class);
    }

    /**
     * @param  Builder<Booking>  $query
     * @return Builder<Booking>
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', '!=', self::STATUS_CANCELLED);
    }

    /**
     * Verifica sobreposição de horário:
     * Uma reserva sobrepõe outra se [start_time < $end] E [end_time > $start].
     */
    /**
     * @param  Builder<Booking>  $query
     * @return Builder<Booking>
     */
    public function scopeOverlapping(
        Builder $query,
        CarbonInterface|string $start,
        CarbonInterface|string $end,
        ?int $excludeId = null
    ): Builder {
        return $query->where('status', '!=', self::STATUS_CANCELLED)
            ->where('start_time', '<', $end)
            ->where('end_time', '>', $start)
            ->when($excludeId !== null, fn (Builder $q) => $q->where('id', '!=', $excludeId));
    }

    public function getVoucherCodeAttribute(): string
    {
        $dateStr = $this->start_time->format('Ymd');

        return sprintf('CWK-%s-%05d', $dateStr, $this->id);
    }

    public function canBeCancelledBy(User $user): bool
    {
        if ($this->status === self::STATUS_CANCELLED || $this->status === self::STATUS_COMPLETED) {
            return false;
        }

        return $user->isAdmin() || $this->user_id === $user->id;
    }
}
