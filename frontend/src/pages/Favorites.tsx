import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert } from '../components/admin/FormControls'
import ComponentBody from '../components/ComponentBody'
import { ChevronLeftIcon, ChevronRightIcon, SearchIcon } from '../components/icons'
import { SpaceCardSkeleton } from '../components/Skeleton'
import SpaceCard from '../components/SpaceCard'
import { ApiError } from '../lib/api'
import { useFavoriteToggle } from '../lib/favorites'
import { href } from '../lib/route'
import { favoritesApi, type Paginated, type Space } from '../lib/spaces'
import { inputClass, primaryButton, secondaryButton } from '../lib/ui'

export default function Favorites() {
    const [items, setItems] = useState<Space[]>([])
    const [meta, setMeta] = useState<Paginated<Space>['meta'] | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [page, setPage] = useState(1)
    const [reloadKey, setReloadKey] = useState(0)
    const [query, setQuery] = useState('')

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
    }, [page, reloadKey])

    // Ao desfavoritar, o card some na hora; se a API falhar, o hook desfaz e ele volta.
    const applyFavorite = useCallback((id: number, favorite: boolean) => {
        setItems((list) => list.map((s) => (s.id === id ? { ...s, is_favorite: favorite } : s)))
    }, [])
    const favorites = useFavoriteToggle(applyFavorite)

    const activeFavorites = useMemo(() => items.filter((s) => s.is_favorite), [items])
    const shown = useMemo(() => {
        const term = query.trim().toLowerCase()
        if (!term) return activeFavorites
        return activeFavorites.filter(
            (s) =>
                s.name.toLowerCase().includes(term) ||
                s.city.toLowerCase().includes(term) ||
                (s.neighborhood ?? '').toLowerCase().includes(term),
        )
    }, [activeFavorites, query])

    const total = meta ? meta.total - (items.length - activeFavorites.length) : 0

    function goToPage(next: number) {
        setPage(next)
        setLoading(true)
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    return (
        <ComponentBody>
            <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                        Meus favoritos
                    </h1>
                    <p className="mt-2 text-sm text-slate-600">
                        Os espaços que você salvou para comparar e reservar rapidamente.
                    </p>
                </div>

                {activeFavorites.length > 0 && (
                    <div className="relative sm:w-72">
                        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="search"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Filtrar favoritos..."
                            aria-label="Filtrar espaços favoritos"
                            className={`h-10 pl-9 text-sm ${inputClass(false)}`}
                        />
                    </div>
                )}
            </div>

            <section aria-labelledby="favorites-list-heading" className="mt-6">
                <h2 id="favorites-list-heading" className="sr-only">
                    Lista de espaços favoritos
                </h2>
                {(error || favorites.error) && (
                    <div className="mb-4 space-y-3">
                        <Alert type="error" onClose={favorites.error ? favorites.clearError : undefined}>
                            {error || favorites.error}
                        </Alert>
                        {error && (
                            <button
                                type="button"
                                onClick={() => {
                                    setLoading(true)
                                    setError('')
                                    setReloadKey((k) => k + 1)
                                }}
                                className={secondaryButton}
                            >
                                Tentar novamente
                            </button>
                        )}
                    </div>
                )}

                {loading && items.length === 0 ? (
                    <ul
                        className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
                        aria-busy="true"
                    >
                        {[0, 1, 2, 3].map((i) => (
                            <li key={i} className="flex">
                                <SpaceCardSkeleton />
                            </li>
                        ))}
                    </ul>
                ) : shown.length === 0 && !error ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
                        <p className="font-display text-xl font-semibold text-slate-900">
                            {query.trim()
                                ? 'Nenhum favorito encontrado para esta busca'
                                : 'Você ainda não salvou nenhum local'}
                        </p>
                        <p className="mt-2 text-sm text-slate-600">
                            {query.trim()
                                ? 'Limpe o filtro para ver todos os seus espaços salvos.'
                                : 'Toque no coração de um espaço para guardá-lo aqui.'}
                        </p>
                        {query.trim() ? (
                            <button
                                type="button"
                                onClick={() => setQuery('')}
                                className={`${secondaryButton} mt-5`}
                            >
                                Limpar busca
                            </button>
                        ) : (
                            <a href={href('home')} className={`${primaryButton} mt-5`}>
                                Explorar locais
                            </a>
                        )}
                    </div>
                ) : (
                    <>
                        <p aria-live="polite" className="mb-4 text-sm font-medium text-slate-600">
                            {query.trim()
                                ? `${shown.length} de ${total} ${total === 1 ? 'local salvo' : 'locais salvos'}`
                                : `${total} ${total === 1 ? 'local salvo' : 'locais salvos'}`}
                        </p>
                        <ul
                            aria-label="Espaços favoritos"
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
            </section>

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
