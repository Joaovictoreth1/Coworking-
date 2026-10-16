<?php

declare(strict_types=1);

namespace App\Providers;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Aqui você faz o bind de interfaces para classes concretas.
        // Exemplo: $this->app->bind(PaymentInterface::class, StripePayment::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // 1. Força o uso de HTTPS em ambiente de produção (evita erros de Mixed Content)
        if ($this->app->environment('production')) {
            URL::forceScheme('https');
        }

        // 2. Habilita o "Strict Mode" dos Models apenas em desenvolvimento/local
        // Isso ativa 3 proteções cruciais:
        // - PreventLazyLoading: Impede o problema de N+1 queries no banco de dados.
        // - PreventSilentlyDiscardingAttributes: Avisa se você tentar salvar um campo que não está no $fillable.
        // - PreventAccessingMissingAttributes: Impede acesso a propriedades que não foram carregadas.
        Model::shouldBeStrict(! $this->app->isProduction());
    }
}
