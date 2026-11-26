import { useState } from 'react'
import { useAuth } from '../auth/context'
import { Alert } from '../components/admin/FormControls'
import ComponentBody from '../components/ComponentBody'
import GoogleMapsExplorer from '../components/GoogleMapsExplorer'
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon, MapPinIcon, SearchIcon } from '../components/icons'
import { SpaceCardSkeleton } from '../components/Skeleton'
import SpaceCard from '../components/SpaceCard'
import SpaceFilters from '../components/SpaceFilters'
import { useSpaceSearch } from '../hooks/useSpaceSearch'
import { href } from '../lib/route'
import { type FilterState } from '../lib/spaces'
import { primaryButton, secondaryButton } from '../lib/ui'

const SKELETON_KEYS = ['s0', 's1', 's2', 's3', 's4', 's5', 's6', 's7']

const QUICK_PRESETS: { label: string; priceType: FilterState['priceType']; sort?: 'rating' }[] = [
    { label: 'Todos os espaços', priceType: '' },
    { label: 'Por hora', priceType: 'hourly' },
    { label: 'Diária', priceType: 'daily' },
    { label: 'Mensal', priceType: 'monthly' },
    { label: 'Gratuitos', priceType: 'free' },
    { label: 'Mais bem avaliados', priceType: '', sort: 'rating' },
]

export default function Home() {
    const { user } = useAuth()
    const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid')
    const {
        search,
        setSearch,
        filters,
        setFilters,
        clearFilters,
        clearAll,
        refetch,
        meta,
        goToPage,
        items,
        isLoading,
        isFetching,
        errorMessage,
        filtersOn,
        favorites,
    } = useSpaceSearch()

    return (
        <ComponentBody>
            {/* Hero com busca integrada e atalhos rápidos */}
            <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 px-6 py-10 text-white shadow-xl sm:px-10 sm:py-12">
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl"
                />
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-sky-500/15 blur-3xl"
                />

                <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                    <div className="max-w-2xl">
                        <span className="inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/15 px-3 py-1 text-xs font-semibold tracking-wide text-indigo-200">
                            Coworking Brasil · Reserva imediata
                        </span>
                        <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-white sm:text-5xl">
                            Encontre o espaço ideal para produzir melhor
                        </h1>
                        <p className="mt-3 text-base text-slate-300 sm:text-lg">
                            {user
                                ? `Olá, ${user.name.split(' ')[0]}. Compare salas de reunião, estações compartilhadas e espaços gratuitos em segundos.`
                                : 'Coworkings, salas de reunião, bibliotecas e centros culturais: por hora, diária, mensal ou de graça.'}
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        {user ? (
                            <>
                                <a
                                    href={href('my-bookings')}
                                    className="inline-flex h-11 items-center justify-center rounded-xl border border-white/20 bg-white/10 px-4 text-sm font-semibold text-white backdrop-blur-xs transition hover:bg-white/20"
                                >
                                    Minhas reservas
                                </a>
                                <a
                                    href={href('favorites')}
                                    className="inline-flex h-11 items-center justify-center rounded-xl border border-white/20 bg-white/10 px-4 text-sm font-semibold text-white backdrop-blur-xs transition hover:bg-white/20"
                                >
                                    Favoritos
                                </a>
                                <a href={href('spaces')} className={`${primaryButton} !rounded-xl`}>
                                    {user.is_admin ? 'Gerenciar locais' : 'Meus locais'}
                                </a>
                            </>
                        ) : (
                            <>
                                <a href={href('register')} className={`${primaryButton} !rounded-xl`}>
                                    Criar conta grátis
                                </a>
                                <a
                                    href={href('login')}
                                    className="inline-flex h-11 items-center justify-center rounded-xl border border-white/20 bg-white/10 px-5 text-sm font-semibold text-white backdrop-blur-xs transition hover:bg-white/20"
                                >
                                    Entrar
                                </a>
                            </>
                        )}
                    </div>
                </div>

                {/* Barra de busca principal */}
                <form
                    role="search"
                    aria-label="Buscar espaços de coworking"
                    onSubmit={(e) => e.preventDefault()}
                    className="relative mt-8"
                >
                    <SearchIcon className="pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                        type="search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar por nome do espaço, bairro ou cidade (ex.: Paulista, Pinheiros, São Paulo)..."
                        aria-label="Buscar locais"
                        className="h-13 w-full rounded-2xl border border-white/15 bg-white pl-12 pr-4 text-base text-slate-900 shadow-lg placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/25 focus:outline-none"
                    />
                </form>

                {/* Atalhos rápidos + indicadores de confiança */}
                <div className="relative mt-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap gap-2" role="group" aria-label="Atalhos de busca">
                        {QUICK_PRESETS.map((preset) => {
                            const active = preset.sort
                                ? filters.sort === 'rating' && filters.priceType === ''
                                : filters.priceType === preset.priceType &&
                                  (preset.priceType !== '' || filters.sort !== 'rating')
                            return (
                                <button
                                    key={preset.label}
                                    type="button"
                                    aria-pressed={active}
                                    onClick={() =>
                                        setFilters({
                                            ...filters,
                                            priceType: preset.priceType,
                                            sort: preset.sort ?? (filters.sort === 'rating' ? 'recent' : filters.sort),
                                        })
                                    }
                                    className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
                                        active
                                            ? 'bg-white text-slate-900 shadow-sm'
                                            : 'bg-white/10 text-slate-200 hover:bg-white/20'
                                    }`}
                                >
                                    {preset.label}
                                </button>
                            )
                        })}
                    </div>

                    <ul className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-300">
                        <li className="inline-flex items-center gap-1.5">
                            <CheckIcon className="h-3.5 w-3.5 text-emerald-400" />
                            Confirmação imediata
                        </li>
                        <li className="inline-flex items-center gap-1.5">
                            <CheckIcon className="h-3.5 w-3.5 text-emerald-400" />
                            Voucher digital
                        </li>
                        <li className="inline-flex items-center gap-1.5">
                            <CheckIcon className="h-3.5 w-3.5 text-emerald-400" />
                            Sem taxas ocultas
                        </li>
                    </ul>
                </div>
            </section>

            <div className="mt-5">
                <SpaceFilters value={filters} onChange={setFilters} onClear={clearFilters} />
            </div>

            <section aria-labelledby="spaces-results-heading" className="mt-6">
                <h2 id="spaces-results-heading" className="sr-only">
                    Resultados da busca
                </h2>
                {favorites.error && (
                    <div className="mb-4">
                        <Alert type="error" onClose={favorites.clearError}>
                            {favorites.error}
                        </Alert>
                    </div>
                )}

                {errorMessage ? (
                    <div className="space-y-3">
                        <Alert type="error">{errorMessage}</Alert>
                        <button
                            type="button"
                            onClick={() => refetch()}
                            disabled={isFetching}
                            className={secondaryButton}
                        >
                            {isFetching ? 'Recarregando...' : 'Tentar novamente'}
                        </button>
                    </div>
                ) : isLoading ? (
                    <ul
                        className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
                        aria-busy="true"
                        aria-label="Carregando locais"
                    >
                        {SKELETON_KEYS.map((key) => (
                            <li key={key} className="flex">
                                <SpaceCardSkeleton />
                            </li>
                        ))}
                    </ul>
                ) : (
                    <>
                        {meta && (
                            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                                <div className="flex flex-wrap items-center gap-3">
                                    <p aria-live="polite" className="text-sm font-medium text-slate-600">
                                        {meta.total} {meta.total === 1 ? 'local' : 'locais'}
                                        {filtersOn ? ' encontrados' : ' disponíveis'}
                                    </p>
                                    {filtersOn && (
                                        <button
                                            type="button"
                                            onClick={clearAll}
                                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline cursor-pointer"
                                        >
                                            Limpar busca e filtros
                                        </button>
                                    )}
                                </div>

                                <div
                                    role="group"
                                    aria-label="Modo de visualização"
                                    className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-xs"
                                >
                                    <button
                                        type="button"
                                        aria-pressed={viewMode === 'grid'}
                                        onClick={() => setViewMode('grid')}
                                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                                            viewMode === 'grid'
                                                ? 'bg-indigo-600 text-white shadow-xs'
                                                : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                    >
                                        Lista
                                    </button>
                                    <button
                                        type="button"
                                        aria-pressed={viewMode === 'map'}
                                        onClick={() => {
                                            setViewMode('map')
                                            if (!search.trim()) setSearch('São Paulo')
                                        }}
                                        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                                            viewMode === 'map'
                                                ? 'bg-indigo-600 text-white shadow-xs'
                                                : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                    >
                                        <MapPinIcon className="h-3.5 w-3.5" />
                                        Mapa Google Maps (SP)
                                    </button>
                                </div>
                            </div>
                        )}
                        {viewMode === 'map' ? (
                            <GoogleMapsExplorer
                                spaces={items}
                                activeSearch={search}
                                filtersOn={filtersOn}
                                onSelectHub={(hubQuery) => setSearch(hubQuery)}
                                onClearAll={clearAll}
                            />
                        ) : items.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
                                <p className="font-display text-xl font-semibold text-slate-900">
                                    {filtersOn ? 'Nenhum local encontrado' : 'Ainda não há locais disponíveis'}
                                </p>
                                <p className="mt-2 text-slate-600">
                                    {filtersOn
                                        ? 'Tente outro termo ou ajuste a faixa de preço.'
                                        : 'Volte em breve.'}
                                </p>
                                {filtersOn && (
                                    <button
                                        type="button"
                                        onClick={clearAll}
                                        className={`${secondaryButton} mt-5`}
                                    >
                                        Limpar busca e filtros
                                    </button>
                                )}
                            </div>
                        ) : (
                            <ul
                                aria-label="Lista de espaços"
                                className={`grid gap-5 transition-opacity sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 ${
                                    isFetching ? 'opacity-60' : ''
                                }`}
                                aria-busy={isFetching}
                            >
                                {items.map((space) => (
                                    <li key={space.id} className="flex">
                                        <SpaceCard space={space} onToggleFavorite={favorites.toggle} />
                                    </li>
                                ))}
                            </ul>
                        )}
                    </>
                )}
            </section>

            {meta && meta.last_page > 1 && !errorMessage && (
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
