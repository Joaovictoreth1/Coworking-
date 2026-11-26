<?php

declare(strict_types=1);

use App\Http\Controllers\AdminBookingController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\BookingController;
use App\Http\Controllers\FavoriteController;
use App\Http\Controllers\PublicSpaceController;
use App\Http\Controllers\ReservationController;
use App\Http\Controllers\SpaceController;
use App\Http\Controllers\SpacePhotoController;
use App\Http\Controllers\SpaceReviewController;
use Illuminate\Support\Facades\Route;

// ── 1. Autenticação ──────────────────────────────────────────────────────────
Route::prefix('auth')->group(function () {
    Route::post('register', [AuthController::class, 'register'])->middleware('throttle:10,1');
    Route::post('login', [AuthController::class, 'login'])->middleware('throttle:10,1');

    Route::middleware('auth.token')->group(function () {
        Route::get('me', [AuthController::class, 'me']);
        Route::post('logout', [AuthController::class, 'logout']);
    });
});

// ── 2. Vitrine Pública (Token opcional para carregar is_favorite) ─────────────
Route::middleware(['auth.token:optional', 'throttle:120,1'])->group(function () {
    Route::get('spaces', [PublicSpaceController::class, 'index']);
    Route::get('spaces/{space}', [PublicSpaceController::class, 'show'])->whereNumber('space');
    Route::get('spaces/{space}/reviews', [SpaceReviewController::class, 'index'])->whereNumber('space');
    Route::get('spaces/{space}/availability', [ReservationController::class, 'availability'])->whereNumber('space');
    Route::get('spaces/{space}/bookings/availability', [BookingController::class, 'availability'])->whereNumber('space');
    Route::post('spaces/{space}/bookings/preview', [BookingController::class, 'preview'])->whereNumber('space');
});

// ── 3. Áreas Autenticadas do Cliente / Usuário Comum ─────────────────────────
Route::middleware('auth.token')->group(function () {
    // Favoritos
    Route::get('favorites', [FavoriteController::class, 'index']);
    Route::post('spaces/{space}/favorite', [FavoriteController::class, 'store'])->whereNumber('space');
    Route::delete('spaces/{space}/favorite', [FavoriteController::class, 'destroy'])->whereNumber('space');

    // Avaliações
    Route::post('spaces/{space}/reviews', [SpaceReviewController::class, 'store'])
        ->whereNumber('space')
        ->middleware('throttle:30,1');
    Route::delete('spaces/{space}/reviews/{review}', [SpaceReviewController::class, 'destroy'])
        ->whereNumber(['space', 'review']);

    // Reservas (Bookings / Reservations)
    Route::get('bookings', [BookingController::class, 'index']);
    Route::post('spaces/{space}/bookings', [BookingController::class, 'store'])
        ->whereNumber('space')
        ->middleware('throttle:20,1');
    Route::get('bookings/{booking}', [BookingController::class, 'show'])->whereNumber('booking');
    Route::post('bookings/{booking}/cancel', [BookingController::class, 'cancel'])
        ->whereNumber('booking')
        ->middleware('throttle:30,1');
    Route::delete('bookings/{booking}', [BookingController::class, 'cancel'])
        ->whereNumber('booking')
        ->middleware('throttle:30,1');

    Route::get('reservations', [ReservationController::class, 'index']);
    Route::post('spaces/{space}/reservations', [ReservationController::class, 'store'])
        ->whereNumber('space')
        ->middleware('throttle:20,1');
    Route::delete('reservations/{reservation}', [ReservationController::class, 'destroy'])->whereNumber('reservation');
});

// ── 4. Imagens dos Locais (Pública) ──────────────────────────────────────────
Route::get('photos/{photo}', [SpacePhotoController::class, 'show'])
    ->whereNumber('photo')
    ->name('photos.show');

// ── 5. Painel Administrativo ─────────────────────────────────────────────────
Route::middleware('auth.token')->prefix('admin')->group(function () {
    // Gerenciamento de Espaços
    Route::apiResource('spaces', SpaceController::class);
    Route::get('spaces/{space}/reservations', [ReservationController::class, 'forSpace'])->whereNumber('space');
    Route::post('spaces/{space}/photos', [SpacePhotoController::class, 'store']);
    Route::put('spaces/{space}/photos/order', [SpacePhotoController::class, 'reorder']);
    Route::delete('spaces/{space}/photos/{photo}', [SpacePhotoController::class, 'destroy']);

    // Gestão de Reservas e Métricas do Sistema (exclusivo para administradores)
    Route::middleware('admin')->group(function () {
        Route::get('bookings', [AdminBookingController::class, 'index']);
        Route::patch('bookings/{booking}/status', [AdminBookingController::class, 'updateStatus'])->whereNumber('booking');
        Route::get('metrics', [AdminBookingController::class, 'metrics']);
        Route::get('dashboard', [AdminBookingController::class, 'metrics']);
    });
});
