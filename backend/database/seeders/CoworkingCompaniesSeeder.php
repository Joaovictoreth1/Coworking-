<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class CoworkingCompaniesSeeder extends Seeder
{
    private const SPACES = [
        'WeWork Paulista 1374' => [
            'street' => 'Avenida Paulista', 'number' => '1374', 'neighborhood' => 'Bela Vista', 'zip_code' => '01310-100',
            'description' => 'Coworking em frente ao MASP. A diária é para o passe individual; a tarifa por hora é para sala de reunião.',
            'source' => 'https://www.wework.com/pt-BR/buildings/paulista-1374--sao-paulo',
            'hourly_price' => 119, 'daily_price' => 214, 'amenities' => ['wifi', 'coffee', 'meeting_rooms'],
        ],
        'WeWork Nações Unidas 12901' => [
            'street' => 'Avenida das Nações Unidas', 'number' => '12901', 'complement' => 'Torre Norte',
            'neighborhood' => 'Brooklin Paulista', 'zip_code' => '04578-910',
            'description' => 'Coworking com passe diário, salas de reunião por hora e escritório privativo mensal para uma pessoa.',
            'source' => 'https://www.wework.com/pt-BR/buildings/nacoes-unidas-12901--sao-paulo',
            'hourly_price' => 119, 'daily_price' => 214, 'monthly_price' => 1600, 'amenities' => ['wifi', 'coffee'],
        ],
        'WeWork Faria Lima 4055' => [
            'street' => 'Avenida Brigadeiro Faria Lima', 'number' => '4055', 'neighborhood' => 'Itaim Bibi', 'zip_code' => '04538-133',
            'description' => 'Espaço com passes diários, salas de reunião e escritórios privativos. Consulte os valores da unidade.',
            'source' => 'https://www.wework.com/buildings/faria-lima-4055--sao-paulo',
            'amenities' => ['wifi', 'coffee'],
        ],
        'Regus Torre João Salem' => [
            'street' => 'Avenida Paulista', 'number' => '1079', 'complement' => '7º e 8º andares',
            'neighborhood' => 'Bela Vista', 'zip_code' => '01311-200',
            'description' => 'Escritórios flexíveis e passe diário de coworking na Torre João Salem.',
            'source' => 'https://www.regus.com/pt/br/1500',
            'daily_price' => 229,
        ],
        'Spaces Alameda Santos' => [
            'street' => 'Alameda Santos', 'number' => '200', 'neighborhood' => 'Cerqueira César', 'zip_code' => '01418-000',
            'description' => 'Escritórios flexíveis e coworking no Edifício Victoria Plaza. Recepção de segunda a sexta, das 9h às 18h.',
            'source' => 'https://www.myspacesworks.com/centre/2025/details',
            'amenities' => ['reception'],
        ],
        'Locus Coworking Avenida Paulista' => [
            'street' => 'Avenida Paulista', 'number' => '777', 'complement' => '15º andar',
            'neighborhood' => 'Jardim Paulista', 'zip_code' => '01311-914',
            'description' => 'Coworking, escritórios mobiliados e salas de reunião na Avenida Paulista.',
            'source' => 'https://locus.digital/coworking/',
        ],
        'CIVI-CO / Impact Hub São Paulo' => [
            'street' => 'Rua Doutor Virgílio de Carvalho Pinto', 'number' => '445', 'neighborhood' => 'Pinheiros', 'zip_code' => '05415-030',
            'description' => 'Hub de impacto socioambiental com coworking e espaços para eventos. Atendimento de segunda a sexta, das 8h às 20h.',
            'source' => 'https://civi-co.com/contato/',
        ],
        'Cubo Itaú' => [
            'street' => 'Alameda Vicente Pinzon', 'number' => '54', 'neighborhood' => 'Vila Olímpia', 'zip_code' => '04547-130',
            'description' => 'Hub de inovação para startups. O acesso depende das regras de associação e visita do Cubo.',
            'source' => 'https://site.cubo.itau/',
        ],
        'Teia Centro' => [
            'street' => 'Rua Doutor Bráulio Gomes', 'number' => '139', 'neighborhood' => 'Centro Histórico', 'zip_code' => '01047-020',
            'description' => 'Coworking público gratuito da Ade Sampa na Hemeroteca Mário de Andrade, de segunda a sexta, das 9h às 17h. As reservas são feitas pelo Teia.',
            'source' => 'https://adesampa.com.br/teia/work/centro/',
            'is_free' => true, 'amenities' => ['meeting_rooms'],
        ],
        'Teia Taipas' => [
            'street' => 'Rua Diógenes Dourado', 'number' => '101', 'neighborhood' => 'Taipas',
            'description' => 'Coworking público gratuito da Ade Sampa, de segunda a sexta, das 8h às 17h. As reservas são feitas pelo Teia.',
            'source' => 'https://adesampa.com.br/teia/work/taipas/',
            'is_free' => true,
        ],
        'Biblioteca Mário de Andrade — Sala de Estudos' => [
            'street' => 'Rua da Consolação', 'number' => '94', 'neighborhood' => 'Centro', 'zip_code' => '01302-000',
            'description' => 'Sala pública de estudos no térreo, não um coworking comercial. Aberta de segunda a sexta, das 8h30 às 20h30, e sábado, das 10h às 17h.',
            'source' => 'https://prefeitura.sp.gov.br/web/cultura/bma/menu/servico',
            'is_free' => true,
        ],
    ];

    public function run(): void
    {
        $owner = User::where('role', User::ROLE_ADMIN)->orderBy('id')->first();

        if ($owner === null) {
            throw new RuntimeException('Crie um administrador com php artisan coworking:create-admin antes de importar o catálogo.');
        }

        // A API de reservas antiga verifica opening_hours; a atual verifica availability.
        $closed = array_map(fn (int $day) => ['day' => $day, 'enabled' => false], range(0, 6));

        DB::transaction(function () use ($owner, $closed) {
            foreach (self::SPACES as $name => $space) {
                $source = $space['source'];
                unset($space['source']);

                $space['description'] .= " Cadastro informativo, sem reserva por este site. Os preços informados são valores iniciais. Confirme horários e valores na fonte oficial: {$source}";

                $owner->spaces()->updateOrCreate(['name' => $name], $space + [
                    'city' => 'São Paulo',
                    'state' => 'SP',
                    'is_active' => true,
                    'is_free' => false,
                    'hourly_price' => null,
                    'daily_price' => null,
                    'monthly_price' => null,
                    'opening_hours' => $closed,
                    'availability' => $closed,
                ]);
            }
        });
    }
}
