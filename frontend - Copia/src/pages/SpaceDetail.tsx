import { useEffect, useState } from 'react'
import { Alert } from '../components/admin/FormControls'
import ComponentBody from '../components/ComponentBody'
import { ArrowLeftIcon, CheckIcon, ImageIcon, MapPinIcon, UserIcon } from '../components/icons'
import { ApiError } from '../lib/api'
import { href } from '../lib/route'
import {
    WEEKDAYS,
    amenityLabel,
    formatAddress,
    formatBRL,
    publicSpacesApi,
    type DaySchedule,
    type Space,
} from '../lib/spaces'

function ScheduleList({ schedule, offLabel }: { schedule: DaySchedule[]; offLabel: string }) {
    return (
        <ul className="divide-y divide-white/5 rounded-xl border border-white/10">
            {WEEKDAYS.map(({ day, label }) => {
                const entry = schedule.find((d) => d.day === day)
                const open = entry?.enabled
                return (
                    <li key={day} className="flex items-center justify-between px-4 py-2.5 text-sm">
                        <span className={open ? 'text-slate-200' : 'text-slate-500'}>{label}</span>
                        <span className={open ? 'font-medium text-white' : 'text-slate-500'}>
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

    const photos = space?.photos ?? []
    const current = photos[active] ?? photos[0]

    return (
        <ComponentBody>
            <a
                href={href('home')}
                className="inline-flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-white"
            >
                <ArrowLeftIcon className="h-4 w-4" />
                Todos os locais
            </a>

            {loading && <p className="mt-10 text-slate-400">Carregando...</p>}

            {error && (
                <div className="mt-6">
                    <Alert type="error">{error}</Alert>
                </div>
            )}

            {space && (
                <div className="mt-4 grid gap-8 lg:grid-cols-[1fr_22rem]">
                    <div className="min-w-0 space-y-10">
                        <header>
                            <h1 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
                                {space.name}
                            </h1>
                            <p className="mt-2 flex items-start gap-1.5 text-slate-400">
                                <MapPinIcon className="mt-1 h-4 w-4 shrink-0" />
                                <span>
                                    {formatAddress(space)}
                                    {space.complement ? ` · ${space.complement}` : ''}
                                    {space.zip_code ? ` · CEP ${space.zip_code}` : ''}
                                </span>
                            </p>
                            {space.capacity !== null && (
                                <p className="mt-1 flex items-center gap-1.5 text-slate-400">
                                    <UserIcon className="h-4 w-4 shrink-0" />
                                    Até {space.capacity} {space.capacity === 1 ? 'pessoa' : 'pessoas'}
                                </p>
                            )}
                        </header>

                        <div>
                            <div className="grid aspect-[16/10] place-items-center overflow-hidden rounded-2xl border border-white/10 bg-slate-800 text-slate-600">
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
                                                className={`block h-16 w-24 overflow-hidden rounded-lg border-2 transition ${
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
                                <h2 className="font-display text-xl font-semibold text-white">Sobre o local</h2>
                                <p className="mt-3 whitespace-pre-line text-slate-300">{space.description}</p>
                            </section>
                        )}

                        {space.amenities.length > 0 && (
                            <section>
                                <h2 className="font-display text-xl font-semibold text-white">Comodidades</h2>
                                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                                    {space.amenities.map((a) => (
                                        <li key={a} className="flex items-center gap-2.5 text-slate-300">
                                            <CheckIcon className="h-5 w-5 shrink-0 text-indigo-400" />
                                            {amenityLabel(a)}
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}

                        <div className="grid gap-8 md:grid-cols-2">
                            <section>
                                <h2 className="font-display text-xl font-semibold text-white">
                                    Horário de funcionamento
                                </h2>
                                <div className="mt-4">
                                    <ScheduleList schedule={space.opening_hours} offLabel="Fechado" />
                                </div>
                            </section>
                            <section>
                                <h2 className="font-display text-xl font-semibold text-white">
                                    Disponível para locação
                                </h2>
                                <div className="mt-4">
                                    <ScheduleList schedule={space.availability} offLabel="Indisponível" />
                                </div>
                            </section>
                        </div>
                    </div>

                    <aside className="lg:sticky lg:top-24 lg:self-start">
                        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
                            <h2 className="font-display text-lg font-semibold text-white">Preços</h2>
                            <dl className="mt-4 space-y-3">
                                {space.hourly_price !== null && (
                                    <div className="flex items-baseline justify-between">
                                        <dt className="text-slate-400">Por hora</dt>
                                        <dd className="text-2xl font-semibold text-white">
                                            {formatBRL(space.hourly_price)}
                                        </dd>
                                    </div>
                                )}
                                {space.daily_price !== null && (
                                    <div className="flex items-baseline justify-between">
                                        <dt className="text-slate-400">Por dia</dt>
                                        <dd className="text-2xl font-semibold text-white">
                                            {formatBRL(space.daily_price)}
                                        </dd>
                                    </div>
                                )}
                            </dl>
                            <p className="mt-4 text-xs text-slate-500">
                                {[
                                    space.hourly_price !== null && 'locação por hora',
                                    space.daily_price !== null && 'locação por dia',
                                ]
                                    .filter(Boolean)
                                    .join(' e ')
                                    .replace(/^./, (c) => c.toUpperCase())}{' '}
                                disponível neste local.
                            </p>
                        </div>
                    </aside>
                </div>
            )}
        </ComponentBody>
    )
}
