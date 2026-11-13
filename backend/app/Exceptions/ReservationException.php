<?php

namespace App\Exceptions;

use Illuminate\Http\JsonResponse;
use RuntimeException;

/** Violação de regra de negócio das reservas; vira uma resposta JSON amigável. */
class ReservationException extends RuntimeException
{
    public function __construct(string $message, private readonly int $status = 422)
    {
        parent::__construct($message);
    }

    public static function conflict(): self
    {
        return new self('Este horário acabou de ser reservado por outra pessoa. Escolha outro horário.', 409);
    }

    public function render(): JsonResponse
    {
        return response()->json(['message' => $this->getMessage()], $this->status);
    }
}
