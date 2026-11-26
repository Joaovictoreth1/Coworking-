<?php

namespace App\Http\Requests;

use App\Models\Reservation;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreReservationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            'rate' => ['required', Rule::in([Reservation::RATE_HOURLY, Reservation::RATE_DAILY])],
            'starts_at' => ['required', 'date'],
            'ends_at' => ['required', 'date'],
        ];
    }

    public function messages(): array
    {
        return [
            'rate.required' => 'Escolha a modalidade: por hora ou por dia.',
            'rate.in' => 'Escolha a modalidade: por hora ou por dia.',
            'starts_at.required' => 'Informe quando a reserva começa.',
            'starts_at.date' => 'A data/hora de início é inválida.',
            'ends_at.required' => 'Informe quando a reserva termina.',
            'ends_at.date' => 'A data/hora de término é inválida.',
        ];
    }

    /** Datas sem fuso explícito são interpretadas no fuso do coworking. */
    public function startsAt(): CarbonImmutable
    {
        return CarbonImmutable::parse($this->validated('starts_at'), config('coworking.timezone'));
    }

    public function endsAt(): CarbonImmutable
    {
        return CarbonImmutable::parse($this->validated('ends_at'), config('coworking.timezone'));
    }
}
