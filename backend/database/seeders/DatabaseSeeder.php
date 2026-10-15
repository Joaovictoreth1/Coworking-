<?php

namespace Database\Seeders;

use App\Models\Space;
use App\Models\SpaceReview;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public const PASSWORD = '12345678';
    public const ADMIN_EMAIL = 'admin@teste.com';

    private const USERS = [
        ['Ana Souza', 'ana@teste.com'],
        ['Bruno Lima', 'bruno@teste.com'],
        ['Carla Mendes', 'carla@teste.com'],
    ];

    private const SPACES_PER_USER = 10;

    // [tipo, descrição, capacidade]
    private const TYPES = [
        ['Sala de reunião', 'Sala reservada, ideal para reuniões de equipe, entrevistas e apresentações para clientes.', 8],
        ['Coworking', 'Estações de trabalho compartilhadas em ambiente silencioso e bem iluminado.', 30],
        ['Estúdio de fotografia', 'Estúdio com fundo infinito e iluminação profissional para ensaios e produções.', 12],
        ['Auditório', 'Auditório com palco e sistema de som para palestras, treinamentos e lançamentos.', 120],
        ['Sala de treinamento', 'Sala em formato flexível, boa para cursos e capacitações presenciais.', 25],
        ['Cabine de call', 'Cabine acústica individual para chamadas de vídeo e reuniões rápidas.', 1],
        ['Espaço para eventos', 'Salão amplo para confraternizações, workshops e eventos corporativos.', 80],
        ['Escritório privativo', 'Escritório fechado com mesas, armários e acesso 24 horas para a equipe.', 10],
        ['Estúdio de podcast', 'Estúdio com tratamento acústico, microfones e mesa de som prontos para gravar.', 5],
        ['Sala de workshop', 'Espaço aberto com mesas móveis e lousas, perfeito para dinâmicas em grupo.', 20],
    ];

    // [rua, número, bairro, cidade, UF, CEP]
    private const PLACES = [
        ['Avenida Paulista', '1578', 'Bela Vista', 'São Paulo', 'SP', '01310-200'],
        ['Rua Oscar Freire', '379', 'Jardins', 'São Paulo', 'SP', '01426-001'],
        ['Rua da Consolação', '2302', 'Consolação', 'São Paulo', 'SP', '01302-001'],
        ['Avenida Atlântica', '1702', 'Copacabana', 'Rio de Janeiro', 'RJ', '22021-001'],
        ['Rua Visconde de Pirajá', '550', 'Ipanema', 'Rio de Janeiro', 'RJ', '22410-002'],
        ['Avenida Afonso Pena', '1500', 'Centro', 'Belo Horizonte', 'MG', '30130-921'],
        ['Rua XV de Novembro', '700', 'Centro', 'Curitiba', 'PR', '80020-310'],
        ['Rua dos Andradas', '1234', 'Centro Histórico', 'Porto Alegre', 'RS', '90020-007'],
        ['Avenida Beira Mar Norte', '2100', 'Centro', 'Florianópolis', 'SC', '88015-100'],
        ['Rua Barão de Itapura', '950', 'Centro', 'Dracena', 'SP', '17900-000'],
    ];

    // Espaços 100% gratuitos: [tipo, descrição, capacidade]
    private const FREE_TYPES = [
        ['Biblioteca Pública', 'Biblioteca de acesso livre, com mesas de estudo, tomadas e wi-fi gratuito para trabalhar em silêncio.', 60],
        ['Centro Cultural', 'Centro cultural adaptado, com mesas de leitura, ambiente climatizado e entrada gratuita.', 40],
    ];

    private const REVIEW_COMMENTS = [
        [5, 'Ambiente excelente, internet muito estável e atendimento atencioso. Voltarei com certeza.'],
        [5, 'Ótima infraestrutura para reuniões: sala silenciosa, ar-condicionado e projetor funcionando.'],
        [4, 'Muito bom! Só achei o café um pouco fraco, mas o resto é impecável.'],
        [4, 'Localização ótima e fácil de chegar. Mesas confortáveis para um dia inteiro de trabalho.'],
        [3, 'Espaço ok pelo preço. O wi-fi oscilou um pouco no período da tarde.'],
        [5, 'Limpo, organizado e com uma equipe que realmente ajuda. Recomendo.'],
        [4, 'Boa acústica e iluminação natural. Faltou apenas mais tomadas perto das mesas.'],
        [2, 'O local é bonito, mas estava barulhento e a sala não correspondia às fotos.'],
        [5, 'Perfeito para estudar e trabalhar, tranquilo e com acessibilidade em todo o espaço.'],
        [3, null],
    ];

    private const AMENITY_IDS = [
        'wifi', 'air_conditioning', 'coffee', 'call_booths', 'meeting_rooms', 'projector',
        'whiteboard', 'printer', 'kitchen', 'parking', 'reception', 'lockers', 'accessibility', 'security',
    ];

    private const HOURLY = [25, 35, 45, 60, 80, 120, 150];

    /**
     * Pode rodar várias vezes: recria/atualiza os usuários (senha padrão 12345678)
     * e só cria os locais de quem ainda não tem nenhum.
     */
    public function run(): void
    {
        $admin = User::updateOrCreate(
            ['email' => self::ADMIN_EMAIL],
            ['name' => 'Admin', 'password' => self::PASSWORD],
        );
        // role não é mass-assignable de propósito (o cadastro público não pode criar admins).
        $admin->forceFill(['role' => User::ROLE_ADMIN])->save();

        $users = [];

        foreach (self::USERS as $index => [$name, $email]) {
            $user = User::updateOrCreate(
                ['email' => $email],
                ['name' => $name, 'password' => self::PASSWORD],
            );
            $user->forceFill(['role' => User::ROLE_USER])->save();

            if ($user->spaces()->count() === 0) {
                $this->createSpaces($user, $index);
            }

            // Bases já populadas antes do filtro "gratuito" também ganham os locais gratuitos
            if (! $user->spaces()->where('is_free', true)->exists()) {
                $this->createFreeSpaces($user, $index);
            }

            $users[] = $user;
        }

        $this->createReviews($users);
        $this->createFavorites($users);

        $this->command?->info('Admin: '.self::ADMIN_EMAIL.' | Usuários: '
            .implode(', ', array_column(self::USERS, 1)).' | Senha de todos: '.self::PASSWORD);
    }

    private function createSpaces(User $user, int $userIndex): void
    {
        for ($k = 0; $k < self::SPACES_PER_USER; $k++) {
            [$type, $description, $capacity] = self::TYPES[($k + $userIndex * 3) % count(self::TYPES)];
            [$street, $number, $neighborhood, $city, $state, $zip] = self::PLACES[($k * 3 + $userIndex) % count(self::PLACES)];

            $hourly = self::HOURLY[($k + $userIndex) % count(self::HOURLY)];
            // Alterna: só por hora, só por dia, ou os dois
            $mode = ($k + $userIndex) % 3;

            $opening = match ($k % 3) {
                0 => $this->schedule([1, 2, 3, 4, 5], '08:00', '18:00'),
                1 => $this->schedule([1, 2, 3, 4, 5, 6, 0], '07:00', '22:00'),
                default => $this->schedule([1, 2, 3, 4, 5, 6], '09:00', '20:00'),
            };

            // Metade dos locais libera para locação só parte do funcionamento
            $availability = $k % 2 === 0
                ? $opening
                : $this->schedule([1, 2, 3, 4, 5], '09:00', '17:00');

            $amenities = array_slice(
                array_merge(
                    array_slice(self::AMENITY_IDS, $k % count(self::AMENITY_IDS)),
                    array_slice(self::AMENITY_IDS, 0, $k % count(self::AMENITY_IDS)),
                ),
                0,
                3 + ($k % 5),
            );
            if (! in_array('wifi', $amenities, true)) {
                $amenities[] = 'wifi';
            }
            if ($k % 4 === 3) {
                $amenities[] = 'Sala de descompressão';
            }

            $user->spaces()->create([
                'name' => "$type $neighborhood",
                'description' => $description,
                'capacity' => $capacity,
                'zip_code' => $zip,
                'street' => $street,
                'number' => $number,
                'complement' => $k % 2 === 0 ? 'Sala '.(100 + $k * 7) : null,
                'neighborhood' => $neighborhood,
                'city' => $city,
                'state' => $state,
                'hourly_price' => $mode === 1 ? null : $hourly,
                'daily_price' => $mode === 0 ? null : $hourly * 7,
                // Um a cada três locais também vende pacote mensal (com desconto sobre a diária)
                'monthly_price' => $k % 3 === 0 ? $hourly * 7 * 15 : null,
                'opening_hours' => $opening,
                'availability' => $availability,
                'amenities' => $amenities,
                'is_active' => $k !== 6, // um local inativo por usuário
            ]);
        }
    }

    private function createFreeSpaces(User $user, int $userIndex): void
    {
        foreach (self::FREE_TYPES as $i => [$type, $description, $capacity]) {
            [$street, $number, $neighborhood, $city, $state, $zip] = self::PLACES[($i * 4 + $userIndex * 2) % count(self::PLACES)];

            $schedule = $this->schedule([1, 2, 3, 4, 5, 6], '08:00', '18:00');

            $user->spaces()->create([
                'name' => "$type $neighborhood",
                'description' => $description,
                'capacity' => $capacity,
                'zip_code' => $zip,
                'street' => $street,
                'number' => $number,
                'neighborhood' => $neighborhood,
                'city' => $city,
                'state' => $state,
                'hourly_price' => null,
                'daily_price' => null,
                'monthly_price' => null,
                'is_free' => true,
                'opening_hours' => $schedule,
                'availability' => $schedule,
                'amenities' => ['wifi', 'air_conditioning', 'accessibility', 'security'],
                'is_active' => true,
            ]);
        }
    }

    /** Avaliações de exemplo (só se ainda não existir nenhuma): cada local ativo recebe de 0 a 3. */
    private function createReviews(array $users): void
    {
        if (SpaceReview::query()->exists()) {
            return;
        }

        $total = count(self::REVIEW_COMMENTS);

        foreach (Space::query()->where('is_active', true)->orderBy('id')->get() as $space) {
            $reviewers = array_values(array_filter($users, fn (User $u) => $u->id !== $space->user_id));

            for ($n = 0; $n < $space->id % 4 && $n < count($reviewers); $n++) {
                [$rating, $comment] = self::REVIEW_COMMENTS[($space->id + $n * 3) % $total];

                SpaceReview::create([
                    'space_id' => $space->id,
                    'user_id' => $reviewers[$n]->id,
                    'rating' => $rating,
                    'comment' => $comment,
                ]);
            }
        }
    }

    /** Alguns favoritos de exemplo para cada usuário (só se a tabela estiver vazia). */
    private function createFavorites(array $users): void
    {
        if (DB::table('favorites')->exists()) {
            return;
        }

        $spaceIds = Space::query()->where('is_active', true)->orderBy('id')->pluck('id')->all();

        foreach ($users as $i => $user) {
            for ($n = 0; $n < 4; $n++) {
                $id = $spaceIds[($i * 7 + $n * 5) % max(count($spaceIds), 1)] ?? null;

                if ($id !== null) {
                    DB::table('favorites')->insertOrIgnore([
                        'user_id' => $user->id,
                        'space_id' => $id,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }
        }
    }

    /** @param int[] $enabledDays 0 = domingo ... 6 = sábado */
    private function schedule(array $enabledDays, string $from, string $to): array
    {
        return array_map(fn (int $day) => [
            'day' => $day,
            'enabled' => in_array($day, $enabledDays, true),
            'from' => $from,
            'to' => $to,
        ], [1, 2, 3, 4, 5, 6, 0]);
    }
}
