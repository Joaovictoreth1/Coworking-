<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreBookingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

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
