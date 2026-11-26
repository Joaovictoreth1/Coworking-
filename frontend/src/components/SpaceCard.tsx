import { href } from '../lib/route'
import {
    amenityLabel,
    formatBRL,
    formatRating,
    priceList,
    type DaySchedule,
    type Space,
} from '../lib/spaces'
import FavoriteButton from './FavoriteButton'
import { ImageIcon, MapPinIcon, StarIcon, UserIcon } from './icons'

function getTodayHours(schedule: DaySchedule[]): string | null {
    const today = new Date().getDay()
    const entry = schedule.find((d) => d.day === today)
    if (!entry?.enabled || !entry.from || !entry.to) return null
    return `${entry.from}–${entry.to}`
}

export default function SpaceCard({
    space,
    onToggleFavorite,
}: {
    space: Space
    onToggleFavorite?: (space: Space) => void
}) {
    const shownAmenities = space.amenities.slice(0, 3)
    const extra = space.amenities.length - shownAmenities.length
    const prices = priceList(space)
    const todayHours = getTodayHours(space.opening_hours)

    return (
        <article className="relative flex w-full">
            <a
                href={href('space-detail', space.id)}
                className="group flex w-full flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs transition duration-200 hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-lg"
            >
                <div className="relative grid aspect-[4/3] place-items-center overflow-hidden bg-slate-100 text-slate-500">
                    {space.cover_url ? (
                        <>
                            <img
                                src={space.cover_url}
                                alt=""
                                loading="lazy"
                                decoding="async"
                                className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                            />
                            <div
                                aria-hidden="true"
                                className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-950/45 to-transparent"
                            />
                        </>
                    ) : (
                        <ImageIcon className="h-8 w-8" />
                    )}

                    <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
                        {space.is_free && (
                            <span className="rounded-full border border-emerald-200/80 bg-emerald-50/95 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 backdrop-blur-xs">
                                Gratuito
                            </span>
                        )}
                        {todayHours && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-0.5 text-[11px] font-medium text-slate-700 shadow-xs backdrop-blur-xs">
                                <span
                                    aria-hidden="true"
                                    className="h-1.5 w-1.5 rounded-full bg-emerald-500"
                                />
                                Hoje {todayHours}
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex flex-1 flex-col p-4">
                    <div className="flex items-start justify-between gap-2">
                        <h3 className="font-display text-base leading-snug font-semibold text-slate-900 transition group-hover:text-indigo-700">
                            {space.name}
                        </h3>
                        {space.rating_avg !== null && (
                            <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-xs font-semibold text-amber-800">
                                <StarIcon
                                    fill="currentColor"
                                    strokeWidth={0}
                                    className="h-3.5 w-3.5 text-amber-500"
                                />
                                {formatRating(space.rating_avg)}
                                <span className="font-normal text-amber-700/80">
                                    ({space.reviews_count})
                                </span>
                            </span>
                        )}
                    </div>

                    {space.rating_avg === null && (
                        <p className="mt-0.5 text-xs text-slate-500">Novo espaço · Sem avaliações</p>
                    )}

                    <p className="mt-2 flex items-start gap-1.5 text-sm text-slate-600">
                        <MapPinIcon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                        <span className="line-clamp-1">
                            {space.neighborhood ? `${space.neighborhood} · ` : ''}
                            {space.city}/{space.state}
                        </span>
                    </p>
                    {space.capacity !== null && (
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                            <UserIcon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                            Até {space.capacity} {space.capacity === 1 ? 'pessoa' : 'pessoas'}
                        </p>
                    )}

                    {shownAmenities.length > 0 && (
                        <ul aria-label="Comodidades" className="mt-3 flex flex-wrap gap-1.5">
                            {shownAmenities.map((a) => (
                                <li
                                    key={a}
                                    className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700"
                                >
                                    {amenityLabel(a)}
                                </li>
                            ))}
                            {extra > 0 && (
                                <li className="rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700">
                                    +{extra}
                                </li>
                            )}
                        </ul>
                    )}

                    <div className="mt-auto flex flex-wrap items-baseline gap-x-3 gap-y-0.5 border-t border-slate-100 pt-3.5 mt-4 text-sm">
                        {space.is_free ? (
                            <span className="font-semibold text-emerald-700">Entrada gratuita</span>
                        ) : (
                            prices.map((p, idx) => (
                                <span
                                    key={p.key}
                                    className={
                                        idx === 0
                                            ? 'text-base font-bold text-slate-900'
                                            : 'text-xs font-medium text-slate-600'
                                    }
                                >
                                    {formatBRL(p.value)}
                                    <span className="font-normal text-slate-500">{p.unit}</span>
                                </span>
                            ))
                        )}
                    </div>
                </div>
            </a>

            {onToggleFavorite && (
                <div className="absolute top-2.5 right-2.5">
                    <FavoriteButton
                        active={space.is_favorite}
                        onToggle={() => onToggleFavorite(space)}
                    />
                </div>
            )}
        </article>
    )
}
