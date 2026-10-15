import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { useAuth } from '../auth/context'
import { ApiError } from '../lib/api'
import { href } from '../lib/route'
import {
    formatDate,
    formatRating,
    reviewsApi,
    type Review,
    type ReviewSummary,
} from '../lib/spaces'
import { primaryButton, secondaryButton } from '../lib/ui'
import ConfirmDialog from './admin/ConfirmDialog'
import { Alert, TextArea } from './admin/FormControls'
import { TrashIcon } from './icons'
import { StarInput, Stars } from './StarRating'

const MAX_COMMENT = 2000

function Summary({ summary }: { summary: ReviewSummary }) {
    const max = Math.max(1, ...Object.values(summary.distribution))

    return (
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="shrink-0 text-center sm:w-32">
                <p className="font-display text-5xl font-bold text-slate-900">
                    {summary.average !== null ? formatRating(summary.average) : '–'}
                </p>
                {summary.average !== null && (
                    <div className="mt-1 flex justify-center">
                        <Stars value={summary.average} className="h-5 w-5" />
                    </div>
                )}
                <p className="mt-1 text-sm text-slate-600">
                    {summary.count} {summary.count === 1 ? 'avaliação' : 'avaliações'}
                </p>
            </div>

            <ul className="min-w-0 flex-1 space-y-1.5" aria-label="Distribuição das notas">
                {[5, 4, 3, 2, 1].map((stars) => {
                    const total = summary.distribution[stars] ?? 0
                    return (
                        <li key={stars} className="flex items-center gap-3 text-sm">
                            <span className="w-12 shrink-0 text-slate-600">{stars} ★</span>
                            <span className="h-2 flex-1 overflow-hidden rounded-sm bg-slate-100">
                                <span
                                    className="block h-full bg-amber-500"
                                    style={{ width: `${(total / max) * 100}%` }}
                                />
                            </span>
                            <span className="w-8 shrink-0 text-right text-slate-500">{total}</span>
                        </li>
                    )
                })}
            </ul>
        </div>
    )
}

export default function Reviews({
    spaceId,
    ownerId,
    onSummaryChange,
}: {
    spaceId: number
    ownerId: number
    onSummaryChange?: (summary: ReviewSummary) => void
}) {
    const { user } = useAuth()
    const onSummary = useRef(onSummaryChange)
    onSummary.current = onSummaryChange

    const [items, setItems] = useState<Review[]>([])
    const [summary, setSummary] = useState<ReviewSummary | null>(null)
    const [mine, setMine] = useState<Review | null>(null)
    const [page, setPage] = useState(1)
    const [lastPage, setLastPage] = useState(1)
    const [loading, setLoading] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const [error, setError] = useState('')

    const [rating, setRating] = useState(0)
    const [comment, setComment] = useState('')
    const [formError, setFormError] = useState('')
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [toDelete, setToDelete] = useState<Review | null>(null)
    const [deleting, setDeleting] = useState(false)

    // Carrega a primeira página (e de novo quando o usuário entra/sai da conta)
    const load = useCallback(() => {
        return reviewsApi
            .list(spaceId, 1)
            .then((res) => {
                setItems(res.data)
                setPage(1)
                setLastPage(res.meta.last_page)
                setSummary(res.summary)
                setMine(res.mine)
                setRating(res.mine?.rating ?? 0)
                setComment(res.mine?.comment ?? '')
                setError('')
                onSummary.current?.(res.summary)
            })
            .catch((err) =>
                setError(err instanceof ApiError ? err.message : 'Não foi possível carregar as avaliações.'),
            )
            .finally(() => setLoading(false))
    }, [spaceId, user?.id])

    useEffect(() => {
        load()
    }, [load])

    async function loadMore() {
        setLoadingMore(true)
        try {
            const res = await reviewsApi.list(spaceId, page + 1)
            setItems((list) => [...list, ...res.data.filter((r) => !list.some((l) => l.id === r.id))])
            setPage(res.meta.current_page)
            setLastPage(res.meta.last_page)
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Não foi possível carregar mais avaliações.')
        } finally {
            setLoadingMore(false)
        }
    }

    async function submit(e: FormEvent) {
        e.preventDefault()
        if (rating < 1) {
            setFormError('Escolha uma nota de 1 a 5 estrelas.')
            return
        }

        setSaving(true)
        setFormError('')
        setSaved(false)
        try {
            await reviewsApi.save(spaceId, { rating, comment: comment.trim() || null })
            await load()
            setSaved(true)
        } catch (err) {
            setFormError(
                err instanceof ApiError
                    ? (Object.values(err.errors)[0]?.[0] ?? err.message)
                    : 'Não foi possível salvar a avaliação.',
            )
        } finally {
            setSaving(false)
        }
    }

    async function confirmDelete() {
        if (!toDelete) return
        setDeleting(true)
        try {
            await reviewsApi.remove(spaceId, toDelete.id)
            setToDelete(null)
            setSaved(false)
            await load()
        } catch (err) {
            setToDelete(null)
            setError(err instanceof ApiError ? err.message : 'Não foi possível remover a avaliação.')
        } finally {
            setDeleting(false)
        }
    }

    const isOwner = user?.id === ownerId

    return (
        <section id="avaliacoes" aria-labelledby="reviews-title" className="scroll-mt-24">
            <h2 id="reviews-title" className="font-display text-xl font-semibold text-slate-900">
                Avaliações
            </h2>

            {error && (
                <div className="mt-4">
                    <Alert type="error" onClose={() => setError('')}>
                        {error}
                    </Alert>
                </div>
            )}

            {loading && !summary ? (
                <p className="mt-4 text-slate-600">Carregando avaliações...</p>
            ) : (
                summary && (
                    <div className="mt-4 space-y-6">
                        <div className="rounded-md border border-slate-200 bg-white p-5">
                            <Summary summary={summary} />
                        </div>

                        {/* Formulário: visitante, responsável pelo local ou usuário comum */}
                        <div className="rounded-md border border-slate-200 bg-white p-5">
                            {!user ? (
                                <p className="text-slate-700">
                                    <a
                                        href={href('login')}
                                        className="font-medium text-indigo-600 hover:underline"
                                    >
                                        Entre na sua conta
                                    </a>{' '}
                                    para avaliar este local.
                                </p>
                            ) : isOwner ? (
                                <p className="text-slate-600">
                                    Este local é seu, então a avaliação fica por conta de quem o visita.
                                </p>
                            ) : (
                                <form onSubmit={submit} className="space-y-4" noValidate>
                                    <h3 className="font-medium text-slate-900">
                                        {mine ? 'Sua avaliação' : 'Deixe sua avaliação'}
                                    </h3>
                                    <StarInput value={rating} onChange={setRating} disabled={saving} />
                                    <TextArea
                                        label="Comentário (opcional)"
                                        value={comment}
                                        onChange={setComment}
                                        rows={3}
                                        maxLength={MAX_COMMENT}
                                        placeholder="Como foi a internet, o silêncio, o atendimento, a estrutura?"
                                    />
                                    {formError && (
                                        <p role="alert" className="text-sm text-red-600">
                                            {formError}
                                        </p>
                                    )}
                                    {saved && !formError && (
                                        <p role="status" className="text-sm text-emerald-700">
                                            Avaliação salva. Obrigado!
                                        </p>
                                    )}
                                    <div className="flex flex-wrap gap-3">
                                        <button type="submit" disabled={saving} className={primaryButton}>
                                            {saving
                                                ? 'Salvando...'
                                                : mine
                                                  ? 'Atualizar avaliação'
                                                  : 'Publicar avaliação'}
                                        </button>
                                        {mine && (
                                            <button
                                                type="button"
                                                disabled={saving}
                                                onClick={() => setToDelete(mine)}
                                                className={secondaryButton}
                                            >
                                                Excluir minha avaliação
                                            </button>
                                        )}
                                    </div>
                                </form>
                            )}
                        </div>

                        {items.length === 0 ? (
                            <p className="text-slate-600">
                                Este local ainda não tem avaliações. Seja a primeira pessoa a avaliar.
                            </p>
                        ) : (
                            <ul className="divide-y divide-slate-200 rounded-md border border-slate-200 bg-white">
                                {items.map((review) => (
                                    <li key={review.id} className="p-5">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                                    <span className="font-medium text-slate-900">
                                                        {review.author}
                                                    </span>
                                                    {review.is_mine && (
                                                        <span className="rounded bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                                                            Você
                                                        </span>
                                                    )}
                                                </p>
                                                <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                                                    <Stars value={review.rating} />
                                                    <time dateTime={review.updated_at}>
                                                        {formatDate(review.updated_at)}
                                                    </time>
                                                </p>
                                            </div>
                                            {user?.is_admin && !review.is_mine && (
                                                <button
                                                    type="button"
                                                    onClick={() => setToDelete(review)}
                                                    aria-label={`Remover avaliação de ${review.author}`}
                                                    title="Remover (moderação)"
                                                    className="grid h-8 w-8 shrink-0 place-items-center rounded text-slate-500 transition hover:bg-red-50 hover:text-red-700"
                                                >
                                                    <TrashIcon className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>
                                        {review.comment && (
                                            <p className="mt-3 whitespace-pre-line text-slate-700">
                                                {review.comment}
                                            </p>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}

                        {page < lastPage && (
                            <button
                                type="button"
                                onClick={loadMore}
                                disabled={loadingMore}
                                className={secondaryButton}
                            >
                                {loadingMore ? 'Carregando...' : 'Ver mais avaliações'}
                            </button>
                        )}
                    </div>
                )
            )}

            {toDelete && (
                <ConfirmDialog
                    title="Remover avaliação?"
                    message={
                        toDelete.is_mine
                            ? 'Sua nota e seu comentário serão apagados e a média do local será recalculada.'
                            : `A avaliação de ${toDelete.author} será apagada e a média do local será recalculada.`
                    }
                    confirmLabel="Remover"
                    busy={deleting}
                    onConfirm={confirmDelete}
                    onCancel={() => setToDelete(null)}
                />
            )}
        </section>
    )
}
