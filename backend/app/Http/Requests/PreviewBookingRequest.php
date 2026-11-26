<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class PreviewBookingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'start_time' => ['required', 'date'],
            'end_time' => ['required', 'date', 'after:start_time'],
        ];
    }

    public function messages(): array
    {
        return [
            'start_time.required' => 'O horário de início da reserva é obrigatório.',
            'start_time.date' => 'O horário de início deve ser uma data válida.',
            'end_time.required' => 'O horário de término da reserva é obrigatório.',
            'end_time.date' => 'O horário de término deve ser uma data válida.',
            'end_time.after' => 'O horário de término deve ser posterior ao horário de início.',
        ];
    }
}
