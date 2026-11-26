import { useCallback, useEffect, useState } from 'react'
import { Alert } from '../components/admin/FormControls'
import { BookingWidget } from '../components/BookingWidget'
import ComponentBody from '../components/ComponentBody'
import FavoriteButton from '../components/FavoriteButton'
import {
    ArrowLeftIcon,
    CheckIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    ImageIcon,
    MapPinIcon,
    UserIcon,
} from '../components/icons'
import Reviews from '../components/Reviews'
import { Stars } from '../components/StarRating'
import { ApiError } from '../lib/api'
import { useFavoriteToggle } from '../lib/favorites'
import {
    getGoogleMapsDirectionsUrl,
    getGoogleMapsEmbedUrl,
    getGoogleMapsPlaceUrl,
    hasCoordinates,
} from '../lib/maps'
import { href } from '../lib/route'
import {
    WEEKDAYS,
    amenityLabel,
    formatAddress,
    formatRating,
    publicSpacesApi,
    type DaySchedule,
    type ReviewSummary,
    type Space,
} from '../lib/spaces'
import { secondaryButton } from '../lib/ui'
import { useToastStore } from '../store/useToastStore'

function ScheduleList({ schedule, offLabel }: { schedule: DaySchedule[]; offLabel: string }) {
    const today = new Date().getDay()
    return (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
            {WEEKDAYS.map(({ day, label }) => {
                const entry = schedule.find((d) => d.day === day)
                const open = entry?.enabled
                const isToday = day === today
                return (
                    <li
                        key={day}
                        className={`flex items-center justify-between px-4 py-2.5 text-sm ${
                            isToday ? 'bg-indigo-50/60' : ''
                        }`}
                    >
                        <span className="flex items-center gap-2">
                            <span className={open || isToday ? 'font-medium text-slate-900' : 'text-slate-500'}>
                                {label}
                            </span>
                            {isToday && (
                                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
                                    Hoje
                                </span>
                            )}
                        </span>
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
    const [reloadKey, setReloadKey] = useState(0)
    const [active, setActive] = useState(0)
    const [lightboxOpen, setLightboxOpen] = useState(false)
    const addToast = useToastStore((s) => s.addToast)

    useEffect(() => {
        let cancelled = false
        publicSpacesApi
            .get(id)
            .then((data) => {
                if (!cancelled) {
                    setError('')
                    setSpace(data)
                    document.title = `${data.name} · Coworking Brasil`
                }
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
    }, [id, reloadKey])

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
    const photoCount = photos.length

    const prevPhoto = useCallback(() => {
        if (photoCount < 2) return
        setActive((idx) => (idx - 1 + photoCount) % photoCount)
    }, [photoCount])

    const nextPhoto = useCallback(() => {
        if (photoCount < 2) return
        setActive((idx) => (idx + 1) % photoCount)
    }, [photoCount])

    // Navegação por teclado dentro do lightbox
    useEffect(() => {
        if (!lightboxOpen) return
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setLightboxOpen(false)
            else if (e.key === 'ArrowLeft') prevPhoto()
            else if (e.key === 'ArrowRight') nextPhoto()
        }
        document.addEventListener('keydown', onKeyDown)
        return () => document.removeEventListener('keydown', onKeyDown)
    }, [lightboxOpen, prevPhoto, nextPhoto])

    async function handleShare() {
        const url = window.location.href
        if (navigator.share && space) {
            try {
                await navigator.share({ title: space.name, url })
                return
            } catch {
                // Usuário cancelou ou navegador recusou -> cai no fallback de copiar
            }
        }
        try {
            await navigator.clipboard.writeText(url)
            addToast('Link do espaço copiado!', 'success')
        } catch {
            addToast('Não foi possível copiar o link.', 'error')
        }
    }

    return (
        <ComponentBody>
            <a
                href={href('home')}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition hover:text-indigo-600"
            >
                <ArrowLeftIcon className="h-4 w-4" />
                Todos os locais
            </a>

            {loading && (
                <div
                    role="status"
                    aria-live="polite"
                    aria-label="Carregando detalhes do espaço"
                    className="mt-6 grid gap-8 lg:grid-cols-[1fr_22rem] animate-pulse"
                >
                    <div className="space-y-6">
                        <div className="h-9 w-2/3 rounded-lg bg-slate-200" />
                        <div className="h-4 w-1/2 rounded bg-slate-200" />
                        <div className="aspect-[16/10] w-full rounded-2xl bg-slate-200" />
                        <div className="h-24 w-full rounded-xl bg-slate-200" />
                    </div>
                    <div className="h-96 rounded-2xl bg-slate-200" />
                </div>
            )}

            {error && !loading && (
                <div className="mt-6 space-y-3">
                    <Alert type="error">{error}</Alert>
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
                </div>
            )}

            {space && !loading && (
                <div className="mt-4 grid gap-8 lg:grid-cols-[1fr_22rem]">
                    <article className="min-w-0 space-y-10">
                        <header>
                            <div className="flex flex-wrap items-start justify-between gap-4">
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
                                                className="inline-flex items-center gap-2 text-slate-700 hover:underline cursor-pointer"
                                            >
                                                <Stars value={space.rating_avg} />
                                                <span className="font-semibold text-slate-900">
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
                                            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                                                Gratuito
                                            </span>
                                        )}
                                    </p>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={handleShare}
                                        className="inline-flex h-10 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 cursor-pointer"
                                    >
                                        Compartilhar
                                    </button>
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
                            <p className="mt-3 flex items-start gap-1.5 text-slate-600">
                                <MapPinIcon className="mt-1 h-4 w-4 shrink-0 text-slate-400" />
                                <span>
                                    {formatAddress(space)}
                                    {space.complement ? ` · ${space.complement}` : ''}
                                    {space.zip_code ? ` · CEP ${space.zip_code}` : ''}
                                </span>
                            </p>
                            {space.capacity !== null && (
                                <p className="mt-1 flex items-center gap-1.5 text-slate-600">
                                    <UserIcon className="h-4 w-4 shrink-0 text-slate-400" />
                                    Até {space.capacity} {space.capacity === 1 ? 'pessoa' : 'pessoas'}
                                </p>
                            )}
                        </header>

                        {/* Galeria de fotos com navegação e lightbox */}
                        <div>
                            <div className="group relative grid aspect-[16/10] place-items-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 text-slate-500">
                                {current ? (
                                    <button
                                        type="button"
                                        onClick={() => setLightboxOpen(true)}
                                        aria-label="Ampliar foto em tela cheia"
                                        className="h-full w-full cursor-zoom-in focus:outline-none"
                                    >
                                        <img
                                            src={current.url}
                                            alt={`${space.name} – foto ${photos.indexOf(current) + 1}`}
                                            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.01]"
                                        />
                                    </button>
                                ) : (
                                    <ImageIcon className="h-10 w-10" />
                                )}

                                {photoCount > 1 && (
                                    <>
                                        <button
                                            type="button"
                                            onClick={prevPhoto}
                                            aria-label="Foto anterior"
                                            className="absolute top-1/2 left-3 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-slate-800 shadow-md transition hover:bg-white cursor-pointer"
                                        >
                                            <ChevronLeftIcon className="h-5 w-5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={nextPhoto}
                                            aria-label="Próxima foto"
                                            className="absolute top-1/2 right-3 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-slate-800 shadow-md transition hover:bg-white cursor-pointer"
                                        >
                                            <ChevronRightIcon className="h-5 w-5" />
                                        </button>
                                        <span className="pointer-events-none absolute right-3 bottom-3 rounded-full bg-slate-900/75 px-2.5 py-0.5 text-xs font-medium text-white backdrop-blur-xs">
                                            {active + 1} / {photoCount}
                                        </span>
                                    </>
                                )}
                            </div>
                            {photoCount > 1 && (
                                <ul
                                    aria-label="Galeria de fotos do espaço"
                                    className="mt-3 flex gap-2 overflow-x-auto pb-1"
                                >
                                    {photos.map((photo, index) => (
                                        <li key={photo.id} className="shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => setActive(index)}
                                                aria-label={`Ver foto ${index + 1}`}
                                                aria-current={photo.id === current?.id}
                                                className={`block h-16 w-24 overflow-hidden rounded-lg border-2 transition cursor-pointer ${
                                                    photo.id === current?.id
                                                        ? 'border-indigo-500 ring-2 ring-indigo-500/20'
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
                                <p className="mt-3 whitespace-pre-line leading-relaxed text-slate-700">
                                    {space.description}
                                </p>
                            </section>
                        )}

                        {space.amenities.length > 0 && (
                            <section>
                                <h2 className="font-display text-xl font-semibold text-slate-900">Comodidades</h2>
                                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                                    {space.amenities.map((a) => (
                                        <li
                                            key={a}
                                            className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700"
                                        >
                                            <CheckIcon className="h-4 w-4 shrink-0 text-indigo-600" />
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

                        <section aria-labelledby="space-map-heading">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <h2
                                        id="space-map-heading"
                                        className="font-display text-xl font-semibold text-slate-900"
                                    >
                                        Localização no Google Maps
                                    </h2>
                                    <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600">
                                        <MapPinIcon className="h-4 w-4 shrink-0 text-indigo-600" />
                                        <span>{formatAddress(space)}</span>
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <a
                                        href={getGoogleMapsDirectionsUrl(space)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`${secondaryButton} !h-9 !rounded-xl !px-3.5 text-xs`}
                                    >
                                        Como chegar
                                    </a>
                                    <a
                                        href={getGoogleMapsPlaceUrl(space)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`${secondaryButton} !h-9 !rounded-xl !px-3.5 text-xs`}
                                    >
                                        Abrir no Google Maps
                                    </a>
                                </div>
                            </div>
                            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-xs">
                                <iframe
                                    title={`Mapa Google Maps de ${space.name}`}
                                    src={getGoogleMapsEmbedUrl(space)}
                                    loading="lazy"
                                    referrerPolicy="no-referrer-when-downgrade"
                                    className="h-72 w-full border-0 sm:h-80"
                                />
                            </div>
                            {hasCoordinates(space) && (
                                <p className="mt-2 text-xs text-slate-500">
                                    Coordenadas GPS: {space.latitude.toFixed(5)}, {space.longitude.toFixed(5)}
                                </p>
                            )}
                        </section>

                        <Reviews
                            spaceId={space.id}
                            ownerId={space.owner_id}
                            onSummaryChange={onSummaryChange}
                        />
                    </article>

                    <BookingWidget space={space} />
                </div>
            )}

            {/* Lightbox de fotos em tela cheia */}
            {lightboxOpen && current && space && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label={`Galeria de fotos de ${space.name}`}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-xs"
                    onPointerDown={(e) => {
                        if (e.target === e.currentTarget) setLightboxOpen(false)
                    }}
                >
                    <button
                        type="button"
                        onClick={() => setLightboxOpen(false)}
                        aria-label="Fechar galeria"
                        className="absolute top-4 right-4 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 cursor-pointer"
                    >
                        <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                            aria-hidden="true"
                            className="h-5 w-5"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                    </button>

                    {photoCount > 1 && (
                        <button
                            type="button"
                            onClick={prevPhoto}
                            aria-label="Foto anterior"
                            className="absolute left-4 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 cursor-pointer"
                        >
                            <ChevronLeftIcon className="h-6 w-6" />
                        </button>
                    )}

                    <figure className="flex max-h-[85vh] max-w-5xl flex-col items-center gap-3">
                        <img
                            src={current.url}
                            alt={`${space.name} – foto ${active + 1}`}
                            className="max-h-[80vh] w-auto rounded-xl object-contain shadow-2xl"
                        />
                        <figcaption className="text-xs font-medium text-slate-300">
                            {space.name} · Foto {active + 1} de {photoCount}
                        </figcaption>
                    </figure>

                    {photoCount > 1 && (
                        <button
                            type="button"
                            onClick={nextPhoto}
                            aria-label="Próxima foto"
                            className="absolute right-4 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 cursor-pointer"
                        >
                            <ChevronRightIcon className="h-6 w-6" />
                        </button>
                    )}
                </div>
            )}
        </ComponentBody>
    )
}
