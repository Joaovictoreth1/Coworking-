import { useCallback, useEffect, useState } from 'react'
import { Alert } from '../components/admin/FormControls'
import ComponentBody from '../components/ComponentBody'
import FavoriteButton from '../components/FavoriteButton'
import { ArrowLeftIcon, CheckIcon, ImageIcon, MapPinIcon, UserIcon } from '../components/icons'
import Reviews from '../components/Reviews'
import { Stars } from '../components/StarRating'
import { ApiError } from '../lib/api'
import { useFavoriteToggle } from '../lib/favorites'
import { href } from '../lib/route'
import {
    WEEKDAYS,
    amenityLabel,
    formatAddress,
    formatBRL,
    formatRating,
    joinList,
    priceList,
    publicSpacesApi,
    type DaySchedule,
    type ReviewSummary,
    type Space,
} from '../lib/spaces'

function ScheduleList({ schedule, offLabel }: { schedule: DaySchedule[]; offLabel: string }) {
    return (
        <ul className="divide-y divide-slate-100 rounded-md border border-slate-200">
            {WEEKDAYS.map(({ day, label }) => {
                const entry = schedule.find((d) => d.day === day)
                const open = entry?.enabled
                return (
                    <li key={day} className="flex items-center justify-between px-4 py-2.5 text-sm">
                        <span className={open ? 'text-slate-800' : 'text-slate-500'}>{label}</span>
                        <span className={open ? 'font-medium text-slate-900' : 'text-slate-500'}>
                            {open && entry ? `${entry.from} às ${entry.to}` : offLabel}
                        </span>
                    </li>
                )
            })}
        </ul>
    )
}

export default function SpaceDetail({ id }: { id: number }) {
    const [space, setSpace] = useState<Space | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [active, setActive] = useState(0)

    useEffect(() => {
        let cancelled = false
        publicSpacesApi
            .get(id)
            .then((data) => {
                if (!cancelled) setSpace(data)
            })
            .catch((err) => {
                if (cancelled) return
                setError(
                    err instanceof ApiError && err.status === 404
                        ? 'Local não encontrado ou indisponível.'
                        : err instanceof ApiError
                          ? err.message
                          : 'Não foi possível carregar o local.',
                )
            })
            .finally(() => {
                if (!cancelled) setLoading(false)
            })
        return () => {
            cancelled = true
        }
    }, [id])

    const applyFavorite = useCallback((_id: number, favorite: boolean) => {
        setSpace((s) => (s ? { ...s, is_favorite: favorite } : s))
    }, [])
    const favorites = useFavoriteToggle(applyFavorite)

    // Mantém a nota do cabeçalho em sincronia quando a pessoa avalia ou apaga a avaliação
    const onSummaryChange = useCallback((summary: ReviewSummary) => {
        setSpace((s) => (s ? { ...s, rating_avg: summary.average, reviews_count: summary.count } : s))
    }, [])

    const photos = space?.photos ?? []
    const current = photos[active] ?? photos[0]

    return (
        <ComponentBody>
            <a
                href={href('home')}
                className="inline-flex items-center gap-1.5 text-sm text-slate-600 transition hover:text-slate-900"
            >
                <ArrowLeftIcon className="h-4 w-4" />
                Todos os locais
            </a>

            {loading && <p className="mt-10 text-slate-600">Carregando...</p>}

            {error && (
                <div className="mt-6">
                    <Alert type="error">{error}</Alert>
                </div>
            )}

            {space && (
                <div className="mt-4 grid gap-8 lg:grid-cols-[1fr_22rem]">
                    <div className="min-w-0 space-y-10">
                        <header>
                            <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                    <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                                        {space.name}
                                    </h1>
                                    <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                                        {space.rating_avg !== null ? (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    document
                                                        .getElementById('avaliacoes')
                                                        ?.scrollIntoView({ behavior: 'smooth' })
                                                }
                                                className="inline-flex items-center gap-2 text-slate-700 hover:underline"
                                            >
                                                <Stars value={space.rating_avg} />
                                                <span className="font-medium text-slate-900">
                                                    {formatRating(space.rating_avg)}
                                                </span>
                                                <span className="text-slate-500">
                                                    ({space.reviews_count}{' '}
                                                    {space.reviews_count === 1 ? 'avaliação' : 'avaliações'})
                                                </span>
                                            </button>
                                        ) : (
                                            <span className="text-slate-500">Sem avaliações ainda</span>
                                        )}
                                        {space.is_free && (
                                            <span className="rounded border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                                                Gratuito
                                            </span>
                                        )}
                                    </p>
                                </div>
                                <div className="shrink-0">
                                    <FavoriteButton
                                        variant="full"
                                        active={space.is_favorite}
                                        onToggle={() => favorites.toggle(space)}
                                    />
                                </div>
                            </div>
                            {favorites.error && (
                                <div className="mt-3">
                                    <Alert type="error" onClose={favorites.clearError}>
                                        {favorites.error}
                                    </Alert>
                                </div>
                            )}
                            <p className="mt-2 flex items-start gap-1.5 text-slate-600">
                                <MapPinIcon className="mt-1 h-4 w-4 shrink-0" />
                                <span>
                                    {formatAddress(space)}
                                    {space.complement ? ` · ${space.complement}` : ''}
                                    {space.zip_code ? ` · CEP ${space.zip_code}` : ''}
                                </span>
                            </p>
                            {space.capacity !== null && (
                                <p className="mt-1 flex items-center gap-1.5 text-slate-600">
                                    <UserIcon className="h-4 w-4 shrink-0" />
                                    Até {space.capacity} {space.capacity === 1 ? 'pessoa' : 'pessoas'}
                                </p>
                            )}
                        </header>

                        <div>
                            <div className="grid aspect-[16/10] place-items-center overflow-hidden rounded-md border border-slate-200 bg-slate-100 text-slate-600">
                                {current ? (
                                    <img
                                        src={current.url}
                                        alt={`${space.name} – foto ${photos.indexOf(current) + 1}`}
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <ImageIcon className="h-10 w-10" />
                                )}
                            </div>
                            {photos.length > 1 && (
                                <ul className="mt-3 flex gap-2 overflow-x-auto pb-1">
                                    {photos.map((photo, index) => (
                                        <li key={photo.id} className="shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => setActive(index)}
                                                aria-label={`Ver foto ${index + 1}`}
                                                aria-current={photo.id === current?.id}
                                                className={`block h-16 w-24 overflow-hidden rounded border-2 transition ${
                                                    photo.id === current?.id
                                                        ? 'border-indigo-400'
                                                        : 'border-transparent opacity-70 hover:opacity-100'
                                                }`}
                                            >
                                                <img
                                                    src={photo.url}
                                                    alt=""
                                                    loading="lazy"
                                                    className="h-full w-full object-cover"
                                                />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        {space.description && (
                            <section>
                                <h2 className="font-display text-xl font-semibold text-slate-900">Sobre o local</h2>
                                <p className="mt-3 whitespace-pre-line text-slate-700">{space.description}</p>
                            </section>
                        )}

                        {space.amenities.length > 0 && (
                            <section>
                                <h2 className="font-display text-xl font-semibold text-slate-900">Comodidades</h2>
                                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                                    {space.amenities.map((a) => (
                                        <li key={a} className="flex items-center gap-2.5 text-slate-700">
                                            <CheckIcon className="h-5 w-5 shrink-0 text-indigo-600" />
                                            {amenityLabel(a)}
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}

                        <div className="grid gap-8 md:grid-cols-2">
                            <section>
                                <h2 className="font-display text-xl font-semibold text-slate-900">
                                    Horário de funcionamento
                                </h2>
                                <div className="mt-4">
                                    <ScheduleList schedule={space.opening_hours} offLabel="Fechado" />
                                </div>
                            </section>
                            <section>
                                <h2 className="font-display text-xl font-semibold text-slate-900">
                                    Disponível para locação
                                </h2>
                                <div className="mt-4">
                                    <ScheduleList schedule={space.availability} offLabel="Indisponível" />
                                </div>
                            </section>
                        </div>

                        <Reviews
                            spaceId={space.id}
                            ownerId={space.owner_id}
                            onSummaryChange={onSummaryChange}
                        />
                    </div>

                    <aside className="lg:sticky lg:top-24 lg:self-start">
                        <div className="rounded-md border border-slate-200 bg-white p-5">
                            <h2 className="font-display text-lg font-semibold text-slate-900">Preços</h2>
                            {space.is_free ? (
                                <>
                                    <p className="mt-4 text-2xl font-semibold text-emerald-700">
                                        Gratuito
                                    </p>
                                    <p className="mt-2 text-sm text-slate-600">
                                        Entrada livre, sem cobrança. Confira os horários de funcionamento
                                        e as regras de uso do local.
                                    </p>
                                </>
                            ) : (
                                <>
                                    <dl className="mt-4 space-y-3">
                                        {priceList(space).map((p) => (
                                            <div key={p.key} className="flex items-baseline justify-between">
                                                <dt className="text-slate-600">{p.label}</dt>
                                                <dd className="text-2xl font-semibold text-slate-900">
                                                    {formatBRL(p.value)}
                                                </dd>
                                            </div>
                                        ))}
                                    </dl>
                                    <p className="mt-4 text-xs text-slate-500">
                                        {joinList(
                                            [
                                                space.hourly_price !== null && 'locação por hora',
                                                space.daily_price !== null && 'locação por dia',
                                                space.monthly_price !== null && 'pacote mensal',
                                            ].filter((x): x is string => x !== false),
                                        ).replace(/^./, (c) => c.toUpperCase())}{' '}
                                        disponível neste local.
                                    </p>
                                </>
                            )}
                        </div>
                    </aside>
                </div>
            )}
        </ComponentBody>
    )
}
