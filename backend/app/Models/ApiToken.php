<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ApiToken extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id', 
        'name', 
        'token', 
        'last_used_at', 
        'expires_at',
    ];

    protected $hidden = [
        'token',
    ];

    protected function casts(): array
    {
        return [
            // Criptografa o token automaticamente ao salvar e o verifica ao comparar
            'token' => 'hashed', 
            'last_used_at' => 'datetime',
            'expires_at' => 'datetime',
        ];
    }

    /**
     * Verifica se o token já passou da data de expiração.
     */
    public function isExpired(): bool
    {
        return $this->expires_at !== null && $this->expires_at->isPast();
    }

    /**
     * Atualiza a data de último uso do token.
     */
    public function markAsUsed(): void
    {
        $this->update(['last_used_at' => now()]);
    }

    /**
     * Escopo para buscar apenas tokens válidos (não expirados).
     */
    public function scopeValid(Builder $query): Builder
    {
        return $query->where(function (Builder $q) {
            $q->whereNull('expires_at')
              ->orWhere('expires_at', '>', now());
        });
    }

    // --- Relações ---

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
