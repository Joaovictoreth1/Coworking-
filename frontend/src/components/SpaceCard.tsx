import { href } from '../lib/route'
import { amenityLabel, formatBRL, formatRating, priceList, type Space } from '../lib/spaces'
import FavoriteButton from './FavoriteButton'
import { ImageIcon, MapPinIcon, StarIcon, UserIcon } from './icons'

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

    return (
        <div className="relative flex w-full">
            <a
                href={href('space-detail', space.id)}
                className="group flex w-full flex-col overflow-hidden rounded-md border border-slate-200 bg-white transition hover:border-indigo-300 hover:bg-slate-50"
            >
                <div className="relative grid aspect-[4/3] place-items-center overflow-hidden bg-slate-100 text-slate-600">
                    {space.cover_url ? (
                        <img
                            src={space.cover_url}
                            alt=""
                            loading="lazy"
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                        />
                    ) : (
                        <ImageIcon className="h-8 w-8" />
                    )}
                    {space.is_free && (
                        <span className="absolute top-2 left-2 rounded border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                            Gratuito
                        </span>
                    )}
                </div>

                <div className="flex flex-1 flex-col p-4">
                    <h3 className="font-display text-lg leading-snug font-semibold text-slate-900">
                        {space.name}
                    </h3>

                    <p className="mt-1 flex items-center gap-1 text-sm">
                        {space.rating_avg !== null ? (
                            <>
                                <StarIcon
                                    fill="currentColor"
                                    strokeWidth={0}
                                    className="h-4 w-4 text-amber-500"
                                />
                                <span className="font-medium text-slate-900">
                                    {formatRating(space.rating_avg)}
                                </span>
                                <span className="text-slate-500">({space.reviews_count})</span>
                            </>
                        ) : (
                            <span className="text-slate-500">Sem avaliações</span>
                        )}
                    </p>

                    <p className="mt-1 flex items-start gap-1.5 text-sm text-slate-600">
                        <MapPinIcon className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>
                            {space.neighborhood ? `${space.neighborhood} · ` : ''}
                            {space.city}/{space.state}
                        </span>
                    </p>
                    {space.capacity !== null && (
                        <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600">
                            <UserIcon className="h-4 w-4 shrink-0" />
                            Até {space.capacity} {space.capacity === 1 ? 'pessoa' : 'pessoas'}
                        </p>
                    )}

                    {shownAmenities.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                            {shownAmenities.map((a) => (
                                <span
                                    key={a}
                                    className="rounded bg-slate-100 px-2.5 py-0.5 text-xs text-slate-700"
                                >
                                    {amenityLabel(a)}
                                </span>
                            ))}
                            {extra > 0 && (
                                <span className="rounded bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600">
                                    +{extra}
                                </span>
                            )}
                        </div>
                    )}

                    <div className="mt-auto flex flex-wrap gap-x-3 gap-y-0.5 pt-4 text-sm">
                        {space.is_free ? (
                            <span className="font-semibold text-emerald-700">Entrada gratuita</span>
                        ) : (
                            prices.map((p) => (
                                <span key={p.key} className="font-semibold text-slate-900">
                                    {formatBRL(p.value)}
                                    <span className="font-normal text-slate-600">{p.unit}</span>
                                </span>
                            ))
                        )}
                    </div>
                </div>
            </a>

            {onToggleFavorite && (
                <div className="absolute top-2 right-2">
                    <FavoriteButton
                        active={space.is_favorite}
                        onToggle={() => onToggleFavorite(space)}
                    />
                </div>
            )}
        </div>
    )
}
