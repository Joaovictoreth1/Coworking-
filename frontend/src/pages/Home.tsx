import { useAuth } from '../auth/context'
import { Alert } from '../components/admin/FormControls'
import ComponentBody from '../components/ComponentBody'
import { ChevronLeftIcon, ChevronRightIcon, SearchIcon } from '../components/icons'
import { SpaceCardSkeleton } from '../components/Skeleton'
import SpaceCard from '../components/SpaceCard'
import SpaceFilters from '../components/SpaceFilters'
import { useSpaceSearch } from '../hooks/useSpaceSearch'
import { href } from '../lib/route'
import { inputClass, primaryButton, secondaryButton } from '../lib/ui'

const SKELETON_KEYS = ['s0', 's1', 's2', 's3', 's4', 's5', 's6', 's7']

export default function Home() {
    const { user } = useAuth()
    const {
        search,
        setSearch,
        filters,
        setFilters,
        clearFilters,
        meta,
        goToPage,
        items,
        isLoading,
        isFetching,
        errorMessage,
        filtersOn,
        hasActivePriceFilter,
        favorites,
    } = useSpaceSearch()

    return (
        <ComponentBody>
            <section className="flex flex-col items-start gap-6 sm:flex-row sm:items-end sm:justify-between">
                <div className="max-w-2xl">
                    <h1 className="font-display text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
                        Encontre o espaço ideal
                    </h1>
                    <p className="mt-3 text-lg text-slate-600">
                        {user
                            ? `Olá, ${user.name.split(' ')[0]}. Filtre pelo seu orçamento: por hora, diária, mensal ou espaços gratuitos.`
                            : 'Coworkings, salas de reunião, bibliotecas e centros culturais: por hora, diária, mensal ou de graça.'}
                    </p>
                </div>
                <div className="flex flex-wrap gap-3">
                    {user ? (
                        <>
                            <a href={href('favorites')} className={secondaryButton}>
                                Meus favoritos
                            </a>
                            <a href={href('spaces')} className={primaryButton}>
                                {user.is_admin ? 'Gerenciar locais' : 'Meus locais'}
                            </a>
                        </>
                    ) : (
                        <>
                            <a href={href('register')} className={primaryButton}>
                                Criar conta
                            </a>
                            <a href={href('login')} className={secondaryButton}>
                                Entrar
                            </a>
                        </>
                    )}
                </div>
            </section>

            <div className="relative mt-8">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar por nome, bairro ou cidade"
                    aria-label="Buscar locais"
                    className={`h-12 pl-10 ${inputClass(false)}`}
                />
            </div>

            <div className="mt-3">
                <SpaceFilters value={filters} onChange={setFilters} onClear={clearFilters} />
            </div>

            <div className="mt-6">
                {favorites.error && (
                    <div className="mb-4">
                        <Alert type="error" onClose={favorites.clearError}>
                            {favorites.error}
                        </Alert>
                    </div>
                )}

                {errorMessage ? (
                    <Alert type="error">{errorMessage}</Alert>
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
                ) : items.length === 0 ? (
                    <div className="rounded-md border border-dashed border-slate-300 px-6 py-16 text-center">
                        <p className="font-display text-xl font-semibold text-slate-900">
                            {filtersOn ? 'Nenhum local encontrado' : 'Ainda não há locais disponíveis'}
                        </p>
                        <p className="mt-2 text-slate-600">
                            {filtersOn
                                ? 'Tente outro termo ou ajuste a faixa de preço.'
                                : 'Volte em breve.'}
                        </p>
                        {hasActivePriceFilter && (
                            <button
                                type="button"
                                onClick={clearFilters}
                                className={`${secondaryButton} mt-5`}
                            >
                                Limpar filtros
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        {meta && (
                            <p className="mb-4 text-sm text-slate-600">
                                {meta.total} {meta.total === 1 ? 'local' : 'locais'}
                                {filtersOn ? ' encontrados' : ' disponíveis'}
                            </p>
                        )}
                        <ul
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
                    </>
                )}
            </div>

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
