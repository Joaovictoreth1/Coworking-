<?php

namespace App\Http\Controllers;

use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(RegisterRequest $request): JsonResponse
    {
        // A validação e a normalização do e-mail agora ocorrem no RegisterRequest
        $user = User::create($request->validated());

        return response()->json([
            'user' => new UserResource($user),
            'token' => $user->createApiToken($request->device_name ?? 'app'),
        ], 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        // A validação ocorre no LoginRequest
        $user = User::where('email', $request->email)->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['E-mail ou senha incorretos.'],
            ]);
        }

        return response()->json([
            'user' => new UserResource($user),
            'token' => $user->createApiToken($request->device_name ?? 'app'),
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'user' => new UserResource($request->user())
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        // Mantive sua lógica original, mas se estiver usando o Laravel Sanctum padrão, 
        // o ideal seria: $request->user()->currentAccessToken()->delete();
        $request->attributes->get('api_token')?->delete();

        return response()->json(['message' => 'Sessão encerrada.']);
    }
}
