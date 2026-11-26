<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Carbon\CarbonImmutable;
use Illuminate\Foundation\Http\FormRequest;

class StoreBookingRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        foreach (['start_time', 'end_time'] as $field) {
            $value = $this->input($field);
            if (! is_string($value) || ! preg_match('/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?$/D', $value)) {
                continue;
            }

            $parsed = date_parse($value);
            if ($parsed['error_count'] === 0 && $parsed['warning_count'] === 0) {
                $this->merge([$field => CarbonImmutable::parse($value, config('coworking.timezone'))->toIso8601String()]);
            }
        }
    }

    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            'start_time' => ['required', 'date', 'after_or_equal:now'],
            'end_time' => ['required', 'date', 'after:start_time'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function messages(): array
    {
        return [
            'start_time.required' => 'O horário de início da reserva é obrigatório.',
            'start_time.date' => 'O horário de início deve ser uma data válida.',
            'start_time.after_or_equal' => 'O horário de início não pode ser no passado.',
            'end_time.required' => 'O horário de término da reserva é obrigatório.',
            'end_time.date' => 'O horário de término deve ser uma data válida.',
            'end_time.after' => 'O horário de término deve ser posterior ao horário de início.',
            'notes.max' => 'As observações não podem exceder 1000 caracteres.',
        ];
    }
}
