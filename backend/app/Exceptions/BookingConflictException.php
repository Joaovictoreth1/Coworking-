<?php

declare(strict_types=1);

namespace App\Exceptions;

use Illuminate\Http\JsonResponse;
use RuntimeException;

class BookingConflictException extends RuntimeException
{
    /** @param array<string, list<string>> $errors */
    public function __construct(
        string $message,
        public readonly array $errors = [],
        int $status = 409,
    ) {
        parent::__construct($message, $status);
    }

    public static function overlap(): self
    {
        $message = 'Este espaço já possui uma reserva no horário selecionado. Escolha outro intervalo.';

        return new self(
            message: $message,
            errors: [
                'booking_conflict' => [$message],
                'start_time' => ['Horário conflitante com outra reserva ativa.'],
            ],
            status: 409,
        );
    }

    public static function invalidStateTransition(string $message): self
    {
        return new self(
            message: $message,
            errors: ['booking' => [$message]],
            status: 409,
        );
    }

    public function render(): JsonResponse
    {
        $status = $this->getCode() >= 400 && $this->getCode() < 600 ? $this->getCode() : 409;

        return response()->json([
            'message' => $this->getMessage(),
            'errors' => $this->errors !== [] ? $this->errors : ['booking' => [$this->getMessage()]],
        ], $status);
    }
}
