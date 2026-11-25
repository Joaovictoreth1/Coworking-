import { useCallback, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Alert } from '../components/admin/FormControls'
import { BookingWidget } from '../components/BookingWidget'
import ComponentBody from '../components/ComponentBody'
import FavoriteButton from '../components/FavoriteButton'
import { ArrowLeftIcon, CheckIcon, ImageIcon, MapPinIcon, UserIcon } from '../components/icons'
import Reviews from '../components/Reviews'
import { Skeleton } from '../components/Skeleton'
import { Stars } from '../components/StarRating'
import { useSpaceDetailQuery } from '../hooks/useSpaces'
import { ApiError, getErrorMessage } from '../lib/api'
import { useFavoriteToggle } from '../lib/favorites'
import { href } from '../lib/route'
import {
    WEEKDAYS,
    amenityLabel,
    formatAddress,
    formatRating,
    type DaySchedule,
    type ReviewSummary,
    type Space,
} from '../lib/spaces'
import { secondaryButton } from '../lib/ui'

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
    const queryClient = useQueryClient()
    const [active, setActive] = useState(0)

    const { data: space, isLoading, error, refetch } = useSpaceDetailQuery(id)

    const applyFavorite = useCallback(
        (spaceId: number, favorite: boolean) => {
            queryClient.setQueryData<Space>(['space-detail', spaceId], (prev) =>
                prev ? { ...prev, is_favorite: favorite } : prev,
            )
            queryClient.invalidateQueries({ queryKey: ['spaces'] })
        },
        [queryClient],
    )
    const favorites = useFavoriteToggle(applyFavorite)

    const onSummaryChange = useCallback(
        (summary: ReviewSummary) => {
            queryClient.setQueryData<Space>(['space-detail', id], (prev) =>
                prev ? { ...prev, rating_avg: summary.average, reviews_count: summary.count } : prev,
            )
            queryClient.invalidateQueries({ queryKey: ['spaces'] })
        },
        [queryClient, id],
    )

    const errorMessage = error
        ? error instanceof ApiError && error.status === 404
            ? 'Local não encontrado ou indisponível.'
            : getErrorMessage(error, 'Não foi possível carregar o local.')
        : ''

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

            {isLoading && (
                <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_22rem]" aria-busy="true">
                    <div className="space-y-6">
                        <Skeleton className="h-10 w-2/3" />
                        <Skeleton className="aspect-[16/10] w-full rounded-md" />
                        <Skeleton className="h-24 w-full" />
                    </div>
                    <Skeleton className="h-96 w-full rounded-3xl" />
                </div>
            )}

            {errorMessage && (
                <div className="mt-6 space-y-4">
                    <Alert type="error">{errorMessage}</Alert>
                    <button type="button" onClick={() => void refetch()} className={secondaryButton}>
                        Tentar novamente
                    </button>
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
                                                    {space.reviews_count === 1
                                                        ? 'avaliação'
                                                        : 'avaliações'}
                                                    )
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
                                    Até {space.capacity}{' '}
                                    {space.capacity === 1 ? 'pessoa' : 'pessoas'}
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
                                <h2 className="font-display text-xl font-semibold text-slate-900">
                                    Sobre o local
                                </h2>
                                <p className="mt-3 whitespace-pre-line text-slate-700">
                                    {space.description}
                                </p>
                            </section>
                        )}

                        {space.amenities.length > 0 && (
                            <section>
                                <h2 className="font-display text-xl font-semibold text-slate-900">
                                    Comodidades
                                </h2>
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

                    <BookingWidget space={space} />
                </div>
            )}
        </ComponentBody>
    )
}
