import { useEffect, useState } from 'react'
import { useAuth } from '../auth/context'
import { Alert } from '../components/admin/FormControls'
import ComponentBody from '../components/ComponentBody'
import { ChevronLeftIcon, ChevronRightIcon, SearchIcon } from '../components/icons'
import SpaceCard from '../components/SpaceCard'
import { ApiError } from '../lib/api'
import { href } from '../lib/route'
import { publicSpacesApi, type Paginated, type Space } from '../lib/spaces'
import { inputClass, primaryButton, secondaryButton } from '../lib/ui'

export default function Home() {
    const { user } = useAuth()

    const [items, setItems] = useState<Space[]>([])
    const [meta, setMeta] = useState<Paginated<Space>['meta'] | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [search, setSearch] = useState('')
    const [query, setQuery] = useState('')
    const [page, setPage] = useState(1)

    // Espera o usuário parar de digitar antes de buscar
    useEffect(() => {
        const timer = setTimeout(() => {
            const next = search.trim()
            if (next !== query) {
                setQuery(next)
                setPage(1)
                setLoading(true)
            }
        }, 350)
        return () => clearTimeout(timer)
    }, [search, query])

    useEffect(() => {
        let cancelled = false
        publicSpacesApi
            .list({ page, q: query })
            .then((res) => {
                if (cancelled) return
                setItems(res.data)
                setMeta(res.meta)
                setError('')
            })
            .catch((err) => {
                if (cancelled) return
                setError(err instanceof ApiError ? err.message : 'Não foi possível carregar os locais.')
            })
            .finally(() => {
                if (!cancelled) setLoading(false)
            })
        return () => {
            cancelled = true
        }
    }, [page, query])

    function goToPage(next: number) {
        setPage(next)
        setLoading(true)
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    return (
        <ComponentBody>
            <section className="flex flex-col items-start gap-6 sm:flex-row sm:items-end sm:justify-between">
                <div className="max-w-2xl">
                    <h1 className="font-display text-4xl font-bold tracking-tight text-white sm:text-5xl">
                        Encontre o espaço ideal
                    </h1>
                    <p className="mt-3 text-lg text-slate-400">
                        {user
                            ? `Olá, ${user.name.split(' ')[0]}. Veja os locais disponíveis para locação por hora ou por dia.`
                            : 'Salas de reunião, coworkings, estúdios e mais, por hora ou por dia.'}
                    </p>
                </div>
                <div className="flex flex-wrap gap-3">
                    {user ? (
                        <a href={href('spaces')} className={primaryButton}>
                            {user.is_admin ? 'Gerenciar locais' : 'Meus locais'}
                        </a>
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

            <div className="mt-8">
                {error ? (
                    <Alert type="error">{error}</Alert>
                ) : loading && items.length === 0 ? (
                    <ul
                        className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                        aria-busy="true"
                    >
                        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                            <li
                                key={i}
                                className="h-80 animate-pulse rounded-2xl border border-white/10 bg-slate-900/60"
                            />
                        ))}
                    </ul>
                ) : items.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/15 px-6 py-16 text-center">
                        <p className="font-display text-xl font-semibold text-white">
                            {query ? 'Nenhum local encontrado' : 'Ainda não há locais disponíveis'}
                        </p>
                        <p className="mt-2 text-slate-400">
                            {query ? 'Tente buscar por outro termo.' : 'Volte em breve.'}
                        </p>
                    </div>
                ) : (
                    <>
                        {meta && (
                            <p className="mb-4 text-sm text-slate-400">
                                {meta.total} {meta.total === 1 ? 'local' : 'locais'}
                                {query ? ' encontrados' : ' disponíveis'}
                            </p>
                        )}
                        <ul
                            className={`grid gap-5 transition-opacity sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${
                                loading ? 'opacity-60' : ''
                            }`}
                        >
                            {items.map((space) => (
                                <li key={space.id} className="flex">
                                    <div className="flex w-full flex-col [&>a]:flex-1">
                                        <SpaceCard space={space} />
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </>
                )}
            </div>

            {meta && meta.last_page > 1 && !error && (
                <nav
                    aria-label="Paginação"
                    className="mt-8 flex items-center justify-between gap-3 text-sm text-slate-400"
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
