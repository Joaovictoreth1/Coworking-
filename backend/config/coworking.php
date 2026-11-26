<?php

return [
    // Fuso dos horários de funcionamento/disponibilidade dos locais (o banco armazena em UTC).
    'timezone' => env('COWORKING_TIMEZONE', 'America/Sao_Paulo'),
    'demo_password' => env('COWORKING_DEMO_PASSWORD'),

    'reservations' => [
        // Granularidade das reservas por hora, em minutos.
        'slot_minutes' => 30,
        // Antecedência mínima para o usuário cancelar a própria reserva.
        'cancellation_notice_hours' => 2,
        // Limite de antecedência para reservar.
        'max_advance_days' => 180,
        // Máximo de diárias numa mesma reserva.
        'max_days' => 31,
    ],
];
