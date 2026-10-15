import { useCallback, useEffect, useState } from 'react'
import { Alert } from '../components/admin/FormControls'
import ComponentBody from '../components/ComponentBody'
import { ChevronLeftIcon, ChevronRightIcon } from '../components/icons'
import SpaceCard from '../components/SpaceCard'
import { ApiError } from '../lib/api'
import { useFavoriteToggle } from '../lib/favorites'
import { href } from '../lib/route'
import { favoritesApi, type Paginated, type Space } from '../lib/spaces'
import { primaryButton, secondaryButton } from '../lib/ui'

export default function Favorites() {
    const [items, setItems] = useState<Space[]>([])
    const [meta, setMeta] = useState<Paginated<Space>['meta'] | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [page, setPage] = useState(1)

    useEffect(() => {
        let cancelled = false
        favoritesApi
            .list(page)
            .then((res) => {
                if (cancelled) return
                setItems(res.data)
                setMeta(res.meta)
                setError('')
            })
            .catch((err) => {
                if (cancelled) return
                setError(err instanceof ApiError ? err.message : 'Não foi possível carregar os favoritos.')
            })
            .finally(() => {
                if (!cancelled) setLoading(false)
            })
        return () => {
            cancelled = true
        }
    }, [page])

    // Ao desfavoritar, o card some na hora; se a API falhar, o hook desfaz e ele volta.
    const applyFavorite = useCallback((id: number, favorite: boolean) => {
        setItems((list) => list.map((s) => (s.id === id ? { ...s, is_favorite: favorite } : s)))
    }, [])
    const favorites = useFavoriteToggle(applyFavorite)

    const shown = items.filter((s) => s.is_favorite)
    const total = meta ? meta.total - (items.length - shown.length) : 0

    function goToPage(next: number) {
        setPage(next)
        setLoading(true)
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    return (
        <ComponentBody>
            <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Meus favoritos
            </h1>
            <p className="mt-2 text-slate-600">
                Os espaços que você salvou, para voltar a eles rapidamente.
            </p>

            <div className="mt-6">
                {(error || favorites.error) && (
                    <div className="mb-4">
                        <Alert type="error" onClose={favorites.error ? favorites.clearError : undefined}>
                            {error || favorites.error}
                        </Alert>
                    </div>
                )}

                {loading && items.length === 0 ? (
                    <ul
                        className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
                        aria-busy="true"
                    >
                        {[0, 1, 2, 3].map((i) => (
                            <li
                                key={i}
                                className="h-80 animate-pulse rounded-md border border-slate-200 bg-white"
                            />
                        ))}
                    </ul>
                ) : shown.length === 0 && !error ? (
                    <div className="rounded-md border border-dashed border-slate-300 px-6 py-16 text-center">
                        <p className="font-display text-xl font-semibold text-slate-900">
                            Você ainda não salvou nenhum local
                        </p>
                        <p className="mt-2 text-slate-600">
                            Toque no coração de um espaço para guardá-lo aqui.
                        </p>
                        <a href={href('home')} className={`${primaryButton} mt-5`}>
                            Explorar locais
                        </a>
                    </div>
                ) : (
                    <>
                        <p className="mb-4 text-sm text-slate-600">
                            {total} {total === 1 ? 'local salvo' : 'locais salvos'}
                        </p>
                        <ul
                            className={`grid gap-5 transition-opacity sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 ${
                                loading ? 'opacity-60' : ''
                            }`}
                        >
                            {shown.map((space) => (
                                <li key={space.id} className="flex">
                                    <SpaceCard space={space} onToggleFavorite={favorites.toggle} />
                                </li>
                            ))}
                        </ul>
                    </>
                )}
            </div>

            {meta && meta.last_page > 1 && !error && (
                <nav
                    aria-label="Paginação"
                    className="mt-8 flex items-center justify-between gap-3 text-sm text-slate-600"
                >
                    <span>
                        Página {meta.current_page} de {meta.last_page}
                    </span>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            disabled={meta.current_page <= 1}
                            onClick={() => goToPage(meta.current_page - 1)}
                            className={`${secondaryButton} !h-10 !px-3 text-sm`}
                        >
                            <ChevronLeftIcon className="h-4 w-4" />
                            Anterior
                        </button>
                        <button
                            type="button"
                            disabled={meta.current_page >= meta.last_page}
                            onClick={() => goToPage(meta.current_page + 1)}
                            className={`${secondaryButton} !h-10 !px-3 text-sm`}
                        >
                            Próxima
                            <ChevronRightIcon className="h-4 w-4" />
                        </button>
                    </div>
                </nav>
            )}
        </ComponentBody>
    )
}
