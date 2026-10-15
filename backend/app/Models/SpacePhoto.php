<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SpacePhoto extends Model
{
    protected $fillable = ['space_id', 'path', 'original_name', 'position'];

    public function space(): BelongsTo
    {
        return $this->belongsTo(Space::class);
    }
}
