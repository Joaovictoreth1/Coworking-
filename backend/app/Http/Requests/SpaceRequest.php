<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

class SpaceRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        if (! $user) {
            return false;
        }

        // Criação de espaços é restrita a administradores; na edição, o controller valida
        // se o usuário é admin ou dono do espaço (retornando 404 para terceiros).
        if ($this->route('space') !== null) {
            return true;
        }

        return $user->isAdmin();
    }

    protected function prepareForValidation(): void
    {
        if (is_string($this->input('state'))) {
            $this->merge(['state' => strtoupper(trim($this->input('state')))]);
        }

        // Local gratuito não tem preços
        if (filter_var($this->input('is_free'), FILTER_VALIDATE_BOOLEAN)) {
            $this->merge(['hourly_price' => null, 'daily_price' => null, 'monthly_price' => null]);
        }
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:150'],
            'description' => ['nullable', 'string', 'max:5000'],
            'capacity' => ['nullable', 'integer', 'min:1', 'max:100000'],

            'zip_code' => ['nullable', 'regex:/^\d{5}-?\d{3}$/'],
            'street' => ['required', 'string', 'max:255'],
            'number' => ['nullable', 'string', 'max:20'],
            'complement' => ['nullable', 'string', 'max:100'],
            'neighborhood' => ['nullable', 'string', 'max:100'],
            'city' => ['required', 'string', 'max:100'],
            'state' => ['required', 'string', 'size:2', 'alpha'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],

            'hourly_price' => ['nullable', 'numeric', 'min:0.01', 'max:99999999.99'],
            'daily_price' => ['nullable', 'numeric', 'min:0.01', 'max:99999999.99'],
            'monthly_price' => ['nullable', 'numeric', 'min:0.01', 'max:99999999.99'],
            'is_free' => ['sometimes', 'boolean'],

            'is_active' => ['required', 'boolean'],

            'amenities' => ['nullable', 'array', 'max:40'],
            'amenities.*' => ['string', 'max:60', 'distinct:ignore_case'],

            ...$this->scheduleRules('opening_hours'),
            ...$this->scheduleRules('availability'),
        ];
    }

    private function scheduleRules(string $field): array
    {
        // Horários (from/to) só são exigidos nos dias marcados: isso é conferido em after().
        return [
            $field => ['required', 'array', 'size:7'],
            "$field.*.day" => ['required', 'integer', 'between:0,6', 'distinct'],
            "$field.*.enabled" => ['required', 'boolean'],
            "$field.*.from" => ['nullable', 'date_format:H:i'],
            "$field.*.to" => ['nullable', 'date_format:H:i'],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator) {
                $data = $validator->getData();

                $isFree = filter_var($data['is_free'] ?? false, FILTER_VALIDATE_BOOLEAN);

                if (! $isFree
                    && blank($data['hourly_price'] ?? null)
                    && blank($data['daily_price'] ?? null)
                    && blank($data['monthly_price'] ?? null)) {
                    $validator->errors()->add('hourly_price', 'Informe ao menos um preço (hora, dia ou mês) ou marque o local como gratuito.');
                }

                $this->checkSchedule($validator, 'opening_hours');
                $this->checkSchedule($validator, 'availability');
                $this->checkAvailabilityWithinOpeningHours($validator);
            },
        ];
    }

    private function checkSchedule(Validator $validator, string $field): void
    {
        $days = $validator->getData()[$field] ?? null;

        if (! is_array($days)) {
            return;
        }

        $hasEnabledDay = false;

        foreach ($days as $i => $day) {
            if (! is_array($day) || ! filter_var($day['enabled'] ?? false, FILTER_VALIDATE_BOOLEAN)) {
                continue;
            }

            $hasEnabledDay = true;
            $from = $day['from'] ?? null;
            $to = $day['to'] ?? null;

            if (blank($from)) {
                $validator->errors()->add("$field.$i.from", 'Informe a hora de início.');
            }

            if (blank($to)) {
                $validator->errors()->add("$field.$i.to", 'Informe a hora de término.');
            }

            if (is_string($from) && is_string($to) && $from !== '' && $to !== '' && $to <= $from) {
                $validator->errors()->add("$field.$i.to", 'O término deve ser depois do início.');
            }
        }

        if ($field === 'opening_hours' && ! $hasEnabledDay) {
            $validator->errors()->add($field, 'Marque ao menos um dia de funcionamento.');
        }

        if ($field === 'availability' && ! $hasEnabledDay) {
            $validator->errors()->add($field, 'Marque ao menos um dia disponível para locação.');
        }
    }

    private function checkAvailabilityWithinOpeningHours(Validator $validator): void
    {
        $data = $validator->getData();
        $opening = $data['opening_hours'] ?? null;
        $availability = $data['availability'] ?? null;

        if (! is_array($opening) || ! is_array($availability)) {
            return;
        }

        $openingByDay = [];
        foreach ($opening as $entry) {
            if (is_array($entry) && isset($entry['day'])) {
                $openingByDay[(int) $entry['day']] = $entry;
            }
        }

        foreach ($availability as $i => $avail) {
            if (! is_array($avail) || ! filter_var($avail['enabled'] ?? false, FILTER_VALIDATE_BOOLEAN)) {
                continue;
            }

            $day = isset($avail['day']) ? (int) $avail['day'] : null;
            $open = $day !== null ? ($openingByDay[$day] ?? null) : null;

            if (! $open || ! filter_var($open['enabled'] ?? false, FILTER_VALIDATE_BOOLEAN)) {
                $validator->errors()->add(
                    "availability.$i.from",
                    'O local está fechado neste dia no horário de funcionamento.'
                );
                continue;
            }

            $openFrom = $open['from'] ?? null;
            $openTo = $open['to'] ?? null;
            $availFrom = $avail['from'] ?? null;
            $availTo = $avail['to'] ?? null;

            if (is_string($openFrom) && is_string($availFrom) && $openFrom !== '' && $availFrom !== '' && $availFrom < $openFrom) {
                $validator->errors()->add(
                    "availability.$i.from",
                    "O início da locação não pode ser antes da abertura ({$openFrom})."
                );
            }

            if (is_string($openTo) && is_string($availTo) && $openTo !== '' && $availTo !== '' && $availTo > $openTo) {
                $validator->errors()->add(
                    "availability.$i.to",
                    "O término da locação não pode passar do fechamento ({$openTo})."
                );
            }
        }
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Informe o nome do local.',
            'name.max' => 'O nome deve ter no máximo 150 caracteres.',
            'description.max' => 'A descrição deve ter no máximo 5000 caracteres.',
            'capacity.integer' => 'A capacidade deve ser um número inteiro.',
            'capacity.min' => 'A capacidade deve ser de pelo menos 1 pessoa.',
            'zip_code.regex' => 'CEP inválido. Use o formato 00000-000.',
            'street.required' => 'Informe a rua.',
            'city.required' => 'Informe a cidade.',
            'state.required' => 'Informe o estado.',
            'state.size' => 'Use a sigla do estado com 2 letras.',
            'state.alpha' => 'Use a sigla do estado com 2 letras.',
            'hourly_price.numeric' => 'Preço por hora inválido.',
            'hourly_price.min' => 'O preço por hora deve ser maior que zero.',
            'hourly_price.max' => 'Preço por hora alto demais.',
            'daily_price.numeric' => 'Preço por dia inválido.',
            'daily_price.min' => 'O preço por dia deve ser maior que zero.',
            'daily_price.max' => 'Preço por dia alto demais.',
            'monthly_price.numeric' => 'Preço mensal inválido.',
            'monthly_price.min' => 'O preço mensal deve ser maior que zero.',
            'monthly_price.max' => 'Preço mensal alto demais.',
            'amenities.max' => 'Informe no máximo 40 comodidades.',
            'amenities.*.max' => 'Cada comodidade deve ter no máximo 60 caracteres.',
            'amenities.*.distinct' => 'Há comodidades repetidas.',
            'opening_hours.*.from.date_format' => 'Hora de início inválida.',
            'opening_hours.*.to.date_format' => 'Hora de término inválida.',
            'availability.*.from.date_format' => 'Hora de início inválida.',
            'availability.*.to.date_format' => 'Hora de término inválida.',
        ];
    }
}
