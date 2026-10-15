<?php

namespace App\Http\Middleware;

use App\Models\ApiToken;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateApiToken
{
    /**
     * Uso: "auth.token" (obrigatório) ou "auth.token:optional" (rotas públicas que mudam
     * a resposta quando há alguém logado, como o coração de favorito). No modo opcional, um token
     * ausente ou inválido simplesmente segue como visitante.
     */
    public function handle(Request $request, Closure $next, ?string $mode = null): Response
    {
        $optional = $mode === 'optional';
        $plain = $request->bearerToken();

        if (! $plain) {
            return $optional ? $this->asGuest($request, $next) : $this->unauthenticated();
        }

        $token = ApiToken::with('user')
            ->where('token', hash('sha256', $plain))
            ->first();

        if (! $token || ! $token->user || ($token->expires_at && $token->expires_at->isPast())) {
            return $optional ? $this->asGuest($request, $next) : $this->unauthenticated();
        }

        if (! $token->last_used_at || $token->last_used_at->lt(now()->subMinutes(5))) {
            $token->forceFill(['last_used_at' => now()])->save();
        }

        $request->setUserResolver(fn () => $token->user);
        $request->attributes->set('api_token', $token);

        return $next($request);
    }

    private function asGuest(Request $request, Closure $next): Response
    {
        $request->setUserResolver(fn () => null);

        return $next($request);
    }

    private function unauthenticated(): Response
    {
        return response()->json(['message' => 'Não autenticado.'], 401);
    }
}
