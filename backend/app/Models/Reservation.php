<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Reservation extends Model
{
    use HasFactory;

    public const STATUS_CONFIRMED = 'confirmed';
    public const STATUS_CANCELLED = 'cancelled';

    public const RATE_HOURLY = 'hourly';
    public const RATE_DAILY = 'daily';

    protected $fillable = [
        'space_id', 'user_id', 'starts_at', 'ends_at', 'rate', 'status', 'total_price', 'cancelled_at',
    ];

    protected function casts(): array
    {
        return [
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'cancelled_at' => 'datetime',
            'total_price' => 'decimal:2',
        ];
    }

    public function scopeConfirmed(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_CONFIRMED);
    }

    /** Reservas confirmadas que se sobrepõem ao intervalo [start, end) (extremos encostados não conflitam). */
    public function scopeOverlapping(Builder $query, $start, $end): Builder
    {
        return $query->confirmed()->where('starts_at', '<', $end)->where('ends_at', '>', $start);
    }

    public function isCancelled(): bool
    {
        return $this->status === self::STATUS_CANCELLED;
    }

    public function space(): BelongsTo
    {
        return $this->belongsTo(Space::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
