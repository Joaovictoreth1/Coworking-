<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\FavoriteController;
use App\Http\Controllers\PublicSpaceController;
use App\Http\Controllers\SpaceController;
use App\Http\Controllers\SpacePhotoController;
use App\Http\Controllers\SpaceReviewController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function () {
    Route::post('register', [AuthController::class, 'register'])->middleware('throttle:10,1');
    Route::post('login', [AuthController::class, 'login'])->middleware('throttle:10,1');

    Route::middleware('auth.token')->group(function () {
        Route::get('me', [AuthController::class, 'me']);
        Route::post('logout', [AuthController::class, 'logout']);
    });
});

// Vitrine pública: só locais ativos. O token é opcional: com ele a resposta traz "is_favorite".
Route::middleware(['auth.token:optional', 'throttle:120,1'])->group(function () {
    Route::get('spaces', [PublicSpaceController::class, 'index']);
    Route::get('spaces/{space}', [PublicSpaceController::class, 'show'])->whereNumber('space');
    Route::get('spaces/{space}/reviews', [SpaceReviewController::class, 'index'])->whereNumber('space');
});

// Favoritos e avaliações (exigem login)
Route::middleware('auth.token')->group(function () {
    Route::get('favorites', [FavoriteController::class, 'index']);
    Route::post('spaces/{space}/favorite', [FavoriteController::class, 'store'])->whereNumber('space');
    Route::delete('spaces/{space}/favorite', [FavoriteController::class, 'destroy'])->whereNumber('space');

    Route::post('spaces/{space}/reviews', [SpaceReviewController::class, 'store'])
        ->whereNumber('space')
        ->middleware('throttle:30,1');
    Route::delete('spaces/{space}/reviews/{review}', [SpaceReviewController::class, 'destroy'])
        ->whereNumber(['space', 'review']);
});

// Imagens dos locais (pública: usada direto em <img src>)
Route::get('photos/{photo}', [SpacePhotoController::class, 'show'])
    ->whereNumber('photo')
    ->name('photos.show');

// Painel de locais (admin vê todos; usuário comum, só os seus)
Route::middleware('auth.token')->prefix('admin')->group(function () {
    Route::apiResource('spaces', SpaceController::class);

    Route::post('spaces/{space}/photos', [SpacePhotoController::class, 'store']);
    Route::put('spaces/{space}/photos/order', [SpacePhotoController::class, 'reorder']);
    Route::delete('spaces/{space}/photos/{photo}', [SpacePhotoController::class, 'destroy']);
});
