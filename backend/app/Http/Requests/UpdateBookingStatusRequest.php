<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Models\Booking;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateBookingStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isAdmin() ?? false;
    }

    protected function prepareForValidation(): void
    {
        if (is_string($this->input('notes'))) {
            $trimmed = trim($this->input('notes'));
            $this->merge(['notes' => $trimmed === '' ? null : $trimmed]);
        }
    }

    public function rules(): array
    {
        return [
            'status' => ['required', 'string', Rule::in(Booking::ALL_STATUSES)],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function messages(): array
    {
        return [
            'status.required' => 'Informe o novo status da reserva.',
            'status.in' => 'Status de reserva inválido.',
            'notes.string' => 'As observações devem ser um texto válido.',
            'notes.max' => 'As observações não podem exceder 1000 caracteres.',
        ];
    }
}
