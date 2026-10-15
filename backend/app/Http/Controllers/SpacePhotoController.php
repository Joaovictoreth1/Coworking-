<?php

namespace App\Http\Controllers;

use App\Http\Resources\SpaceResource;
use App\Models\Space;
use App\Models\SpacePhoto;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;

class SpacePhotoController extends Controller
{
    /** Rota pública: o <img> do navegador não consegue mandar o Bearer token. */
    public function show(SpacePhoto $photo): Response
    {
        $disk = Storage::disk('public');

        abort_unless($disk->exists($photo->path), 404);

        return $disk->response($photo->path, null, [
            'Cache-Control' => 'public, max-age=86400',
        ]);
    }

    public function store(Request $request, Space $space): JsonResponse
    {
        abort_unless($space->manageableBy($request->user()), 404);

        $request->validate([
            'photos' => ['required', 'array', 'min:1', 'max:'.Space::MAX_PHOTOS],
            'photos.*' => ['file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ], [
            'photos.required' => 'Selecione ao menos uma foto.',
            'photos.max' => 'Envie no máximo '.Space::MAX_PHOTOS.' fotos por vez.',
            'photos.*.image' => 'Envie apenas imagens (JPG, PNG ou WebP).',
            'photos.*.mimes' => 'Envie apenas imagens JPG, PNG ou WebP.',
            'photos.*.max' => 'Cada foto deve ter no máximo 5 MB.',
            'photos.*.uploaded' => 'Não foi possível enviar uma das fotos (arquivo grande demais para o servidor).',
        ]);

        $files = $request->file('photos');

        if ($space->photos()->count() + count($files) > Space::MAX_PHOTOS) {
            throw ValidationException::withMessages([
                'photos' => ['Cada local aceita no máximo '.Space::MAX_PHOTOS.' fotos.'],
            ]);
        }

        $position = $space->photos()->max('position');
        $position = $position === null ? 0 : $position + 1;

        foreach ($files as $file) {
            $space->photos()->create([
                'path' => $file->store("spaces/{$space->id}", 'public'),
                'original_name' => mb_substr($file->getClientOriginalName(), 0, 255),
                'position' => $position++,
            ]);
        }

        return (new SpaceResource($space->load('photos')))
            ->response()
            ->setStatusCode(201);
    }

    /** Recebe os ids das fotos na ordem desejada; a primeira vira a capa. */
    public function reorder(Request $request, Space $space): SpaceResource
    {
        abort_unless($space->manageableBy($request->user()), 404);

        $data = $request->validate([
            'ids' => ['required', 'array', 'max:'.Space::MAX_PHOTOS],
            'ids.*' => ['integer'],
        ]);

        // O filtro por space_id garante que ids de outros locais sejam ignorados.
        foreach (array_values($data['ids']) as $position => $id) {
            SpacePhoto::where('space_id', $space->id)->where('id', $id)->update(['position' => $position]);
        }

        return new SpaceResource($space->load('photos'));
    }

    public function destroy(Request $request, Space $space, SpacePhoto $photo): SpaceResource
    {
        abort_unless($space->manageableBy($request->user()), 404);
        abort_unless($photo->space_id === $space->id, 404);

        Storage::disk('public')->delete($photo->path);
        $photo->delete();

        return new SpaceResource($space->load('photos'));
    }
}
