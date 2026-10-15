import { useEffect, useState } from 'react'
import ConfirmDialog from '../../components/admin/ConfirmDialog'
import { Alert } from '../../components/admin/FormControls'
import ComponentBody from '../../components/ComponentBody'
import {
    ChevronLeftIcon,
    ChevronRightIcon,
    ImageIcon,
    MapPinIcon,
    PencilIcon,
    PlusIcon,
    SearchIcon,
    TrashIcon,
} from '../../components/icons'
import { ApiError } from '../../lib/api'
import { clearFlash, peekFlash, type Flash } from '../../lib/flash'
import { href } from '../../lib/route'
import {
    formatAddress,
    formatBRL,
    formatRating,
    priceList,
    spacesApi,
    summarizeSchedule,
    type Paginated,
    type Space,
} from '../../lib/spaces'
import { inputClass, primaryButton, secondaryButton } from '../../lib/ui'

const STATUS_OPTIONS = [
    { value: '', label: 'Todos os status' },
    { value: 'active', label: 'Ativos' },
    { value: 'inactive', label: 'Inativos' },
]

export default function SpacesList() {
    const [items, setItems] = useState<Space[]>([])
    const [meta, setMeta] = useState<Paginated<Space>['meta'] | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [notice, setNotice] = useState<Flash | null>(peekFlash)

    const [search, setSearch] = useState('')
    const [query, setQuery] = useState('')
    const [status, setStatus] = useState('')
    const [page, setPage] = useState(1)
    const [reloadKey, setReloadKey] = useState(0)

    const [toDelete, setToDelete] = useState<Space | null>(null)
    const [deleting, setDeleting] = useState(false)
    const [deleteError, setDeleteError] = useState('')

    useEffect(() => {
        clearFlash()
    }, [])

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
        spacesApi
            .list({ page, q: query, status })
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
    }, [page, query, status, reloadKey])

    function changeStatus(value: string) {
        setStatus(value)
        setPage(1)
        setLoading(true)
    }

    function goToPage(next: number) {
        setPage(next)
        setLoading(true)
    }

    async function confirmDelete() {
        if (!toDelete) return
        setDeleting(true)
        setDeleteError('')
        try {
            await spacesApi.remove(toDelete.id)
            setToDelete(null)
            setNotice({ type: 'success', text: 'Local excluído.' })
            // Se era o único da última página, volta uma página
            if (items.length === 1 && page > 1) setPage(page - 1)
            setLoading(true)
            setReloadKey((k) => k + 1)
        } catch (err) {
            setDeleteError(err instanceof ApiError ? err.message : 'Não foi possível excluir o local.')
        } finally {
            setDeleting(false)
        }
    }

    const filtering = query !== '' || status !== ''

    return (
        <ComponentBody>
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h1 className="font-display text-3xl font-semibold tracking-tight text-slate-900">
                        Locais
                    </h1>
                    <p className="mt-1 text-slate-600">
                        {meta
                            ? `${meta.total} ${meta.total === 1 ? 'local cadastrado' : 'locais cadastrados'}${filtering ? ' neste filtro' : ''}`
                            : 'Gerencie os espaços disponíveis para locação.'}
                    </p>
                </div>
                <a href={href('space-new')} className={primaryButton}>
                    <PlusIcon className="h-5 w-5" />
                    Novo local
                </a>
            </div>

            {notice && (
                <div className="mt-6">
                    <Alert type={notice.type} onClose={() => setNotice(null)}>
                        {notice.text}
                    </Alert>
                </div>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                    <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input
                        type="search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar por nome, rua, bairro ou cidade"
                        aria-label="Buscar locais"
                        className={`h-11 pl-10 ${inputClass(false)}`}
                    />
                </div>
                <select
                    value={status}
                    onChange={(e) => changeStatus(e.target.value)}
                    aria-label="Filtrar por status"
                    className={`h-11 sm:w-52 ${inputClass(false)}`}
                >
                    {STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                            {o.label}
                        </option>
                    ))}
                </select>
            </div>

            <div className="mt-6">
                {error ? (
                    <Alert type="error">{error}</Alert>
                ) : loading && items.length === 0 ? (
                    <ul className="space-y-3" aria-busy="true">
                        {[0, 1, 2].map((i) => (
                            <li
                                key={i}
                                className="h-28 animate-pulse rounded-md border border-slate-200 bg-white"
                            />
                        ))}
                    </ul>
                ) : items.length === 0 ? (
                    <div className="rounded-md border border-dashed border-slate-300 px-6 py-16 text-center">
                        <p className="font-display text-xl font-semibold text-slate-900">
                            {filtering ? 'Nenhum local encontrado' : 'Nenhum local cadastrado ainda'}
                        </p>
                        <p className="mt-2 text-slate-600">
                            {filtering
                                ? 'Tente outro termo de busca ou mude o filtro de status.'
                                : 'Cadastre o primeiro espaço para começar.'}
                        </p>
                        {!filtering && (
                            <a href={href('space-new')} className={`${primaryButton} mt-6`}>
                                <PlusIcon className="h-5 w-5" />
                                Cadastrar local
                            </a>
                        )}
                    </div>
                ) : (
                    <ul
                        className={`divide-y divide-slate-200 overflow-hidden rounded-md border border-slate-200 bg-white transition-opacity ${
                            loading ? 'opacity-60' : ''
                        }`}
                    >
                        {items.map((space) => (
                            <li
                                key={space.id}
                                className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center"
                            >
                                <div className="grid h-36 w-full place-items-center overflow-hidden rounded-md bg-slate-100 text-slate-600 sm:h-20 sm:w-32 sm:shrink-0">
                                    {space.cover_url ? (
                                        <img
                                            src={space.cover_url}
                                            alt=""
                                            loading="lazy"
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <ImageIcon className="h-7 w-7" />
                                    )}
                                </div>

                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h2 className="truncate font-medium text-slate-900">{space.name}</h2>
                                        <span
                                            className={`rounded px-2.5 py-0.5 text-xs font-medium ${
                                                space.is_active
                                                    ? 'bg-emerald-100 text-emerald-700'
                                                    : 'bg-slate-200 text-slate-700'
                                            }`}
                                        >
                                            {space.is_active ? 'Ativo' : 'Inativo'}
                                        </span>
                                    </div>
                                    <p className="mt-1 flex items-start gap-1.5 text-sm text-slate-600">
                                        <MapPinIcon className="mt-0.5 h-4 w-4 shrink-0" />
                                        <span>{formatAddress(space)}</span>
                                    </p>
                                    <p className="mt-1 text-sm font-medium text-slate-800">
                                        {space.is_free
                                            ? 'Gratuito'
                                            : priceList(space)
                                                  .map((p) => `${formatBRL(p.value)}${p.unit}`)
                                                  .join(' · ')}
                                    </p>
                                    <p className="mt-0.5 text-xs text-slate-500">
                                        {space.rating_avg !== null
                                            ? `★ ${formatRating(space.rating_avg)} (${space.reviews_count}) · `
                                            : 'Sem avaliações · '}
                                        Disponível: {summarizeSchedule(space.availability)}
                                        {space.owner && ` · Responsável: ${space.owner.name}`}
                                    </p>
                                </div>

                                <div className="flex gap-2">
                                    <a
                                        href={href('space-edit', space.id)}
                                        className={`${secondaryButton} !h-10 !px-4 text-sm`}
                                    >
                                        <PencilIcon className="h-4 w-4" />
                                        Editar
                                    </a>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setDeleteError('')
                                            setToDelete(space)
                                        }}
                                        aria-label={`Excluir ${space.name}`}
                                        className="grid h-10 w-10 place-items-center rounded-md border border-slate-200 text-slate-600 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700"
                                    >
                                        <TrashIcon className="h-4 w-4" />
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {meta && meta.last_page > 1 && !error && (
                <nav
                    aria-label="Paginação"
                    className="mt-6 flex items-center justify-between gap-3 text-sm text-slate-600"
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

            {toDelete && (
                <ConfirmDialog
                    title="Excluir local?"
                    message={
                        deleteError ||
                        `"${toDelete.name}" e todas as suas fotos serão removidos. Essa ação não pode ser desfeita.`
                    }
                    busy={deleting}
                    onConfirm={confirmDelete}
                    onCancel={() => setToDelete(null)}
                />
            )}
        </ComponentBody>
    )
}
