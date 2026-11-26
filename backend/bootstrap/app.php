<?php

use App\Http\Middleware\AuthenticateApiToken;
use App\Http\Middleware\EnsureAdmin;
use App\Http\Middleware\SecurityAndRequestIdHeaders;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Atrás do proxy (Caddy) o IP real do cliente vem em X-Forwarded-For; sem isso o throttle
        // enxergaria todos os usuários como um só. Restrinja TRUSTED_PROXIES se expuser o app direto.
        $middleware->trustProxies(at: env('TRUSTED_PROXIES', '*') === '*' ? '*' : explode(',', env('TRUSTED_PROXIES')));

        $middleware->alias([
            'auth.token' => AuthenticateApiToken::class,
            'admin' => EnsureAdmin::class,
        ]);

        $middleware->api(append: [
            SecurityAndRequestIdHeaders::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        $exceptions->render(function (NotFoundHttpException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json([
                    'message' => 'Recurso não encontrado.',
                ], 404);
            }
        });
    })->create();
