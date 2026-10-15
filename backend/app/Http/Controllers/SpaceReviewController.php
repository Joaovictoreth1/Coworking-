<?php

namespace App\Http\Controllers;

use App\Http\Resources\SpaceReviewResource;
use App\Models\Space;
use App\Models\SpaceReview;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class SpaceReviewController extends Controller
{
    public function index(Request $request, Space $space): AnonymousResourceCollection
    {
        abort_unless($space->is_active, 404);

        $reviews = $space->reviews()
            ->with('user:id,name')
            ->latest('updated_at')
            ->latest('id')
            ->paginate(10);

        $mine = $request->user()
            ? $space->reviews()->with('user:id,name')->where('user_id', $request->user()->id)->first()
            : null;

        return SpaceReviewResource::collection($reviews)->additional([
            'summary' => $this->summary($space),
            // Objeto simples (sem o envelope "data"), pois recursos aninhados em additional() não o recebem
            'mine' => $mine ? (new SpaceReviewResource($mine))->resolve($request) : null,
        ]);
    }

    /** Cria a avaliação do usuário ou, se ele já avaliou este local, atualiza a anterior. */
    public function store(Request $request, Space $space): JsonResponse
    {
        abort_unless($space->is_active, 404);

        $user = $request->user();

        if ($space->user_id === $user->id) {
            return response()->json(['message' => 'Você não pode avaliar o seu próprio local.'], 403);
        }

        $data = $request->validate([
            'rating' => ['required', 'integer', 'between:1,5'],
            'comment' => ['nullable', 'string', 'max:2000'],
        ], [
            'rating.required' => 'Escolha uma nota de 1 a 5 estrelas.',
            'rating.integer' => 'Escolha uma nota de 1 a 5 estrelas.',
            'rating.between' => 'Escolha uma nota de 1 a 5 estrelas.',
            'comment.max' => 'O comentário deve ter no máximo 2000 caracteres.',
        ]);

        $comment = isset($data['comment']) ? trim($data['comment']) : null;

        $review = SpaceReview::updateOrCreate(
            ['space_id' => $space->id, 'user_id' => $user->id],
            ['rating' => $data['rating'], 'comment' => $comment === '' ? null : $comment],
        );

        return (new SpaceReviewResource($review->load('user:id,name')))
            ->additional(['summary' => $this->summary($space)])
            ->response()
            ->setStatusCode($review->wasRecentlyCreated ? 201 : 200);
    }

    public function destroy(Request $request, Space $space, SpaceReview $review): JsonResponse
    {
        // 404 (e não 403) se a avaliação não é deste local ou não é de quem pediu (admin pode moderar)
        abort_unless(
            $review->space_id === $space->id
                && ($review->user_id === $request->user()->id || $request->user()->isAdmin()),
            404,
        );

        $review->delete();

        return response()->json(['message' => 'Avaliação removida.', 'summary' => $this->summary($space)]);
    }

    /** Média, total e quantas avaliações cada nota (1 a 5) recebeu. */
    private function summary(Space $space): array
    {
        $counts = $space->reviews()
            ->selectRaw('rating, count(*) as total')
            ->groupBy('rating')
            ->pluck('total', 'rating');

        $distribution = [];
        foreach ([5, 4, 3, 2, 1] as $stars) {
            $distribution[$stars] = (int) ($counts[$stars] ?? 0);
        }

        $count = array_sum($distribution);
        $sum = 0;
        foreach ($distribution as $stars => $total) {
            $sum += $stars * $total;
        }

        return [
            'average' => $count > 0 ? round($sum / $count, 1) : null,
            'count' => $count,
            'distribution' => $distribution,
        ];
    }
}
