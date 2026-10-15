import { href } from '../lib/route'
import { amenityLabel, formatBRL, type Space } from '../lib/spaces'
import { ImageIcon, MapPinIcon, UserIcon } from './icons'

export default function SpaceCard({ space }: { space: Space }) {
    const shownAmenities = space.amenities.slice(0, 3)
    const extra = space.amenities.length - shownAmenities.length

    return (
        <a
            href={href('space-detail', space.id)}
            className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 transition hover:border-indigo-400/40 hover:bg-slate-900"
        >
            <div className="grid aspect-[4/3] place-items-center overflow-hidden bg-slate-800 text-slate-600">
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
            </div>

            <div className="flex flex-1 flex-col p-4">
                <h3 className="font-display text-lg leading-snug font-semibold text-white">
                    {space.name}
                </h3>
                <p className="mt-1 flex items-start gap-1.5 text-sm text-slate-400">
                    <MapPinIcon className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                        {space.neighborhood ? `${space.neighborhood} · ` : ''}
                        {space.city}/{space.state}
                    </span>
                </p>
                {space.capacity !== null && (
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-400">
                        <UserIcon className="h-4 w-4 shrink-0" />
                        Até {space.capacity} {space.capacity === 1 ? 'pessoa' : 'pessoas'}
                    </p>
                )}

                {shownAmenities.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                        {shownAmenities.map((a) => (
                            <span
                                key={a}
                                className="rounded-full bg-white/5 px-2.5 py-0.5 text-xs text-slate-300"
                            >
                                {amenityLabel(a)}
                            </span>
                        ))}
                        {extra > 0 && (
                            <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-xs text-slate-400">
                                +{extra}
                            </span>
                        )}
                    </div>
                )}

                <div className="mt-auto flex flex-wrap gap-x-3 gap-y-0.5 pt-4 text-sm">
                    {space.hourly_price !== null && (
                        <span className="font-semibold text-white">
                            {formatBRL(space.hourly_price)}
                            <span className="font-normal text-slate-400">/hora</span>
                        </span>
                    )}
                    {space.daily_price !== null && (
                        <span className="font-semibold text-white">
                            {formatBRL(space.daily_price)}
                            <span className="font-normal text-slate-400">/dia</span>
                        </span>
                    )}
                </div>
            </div>
        </a>
    )
}
