import { useMemo, useState } from 'react'
import {
    SAO_PAULO_HUBS,
    getGoogleMapsDirectionsUrl,
    getGoogleMapsEmbedUrl,
    getGoogleMapsPlaceUrl,
    getSaoPauloCityMapEmbedUrl,
    hasCoordinates,
} from '../lib/maps'
import { href } from '../lib/route'
import { formatAddress, formatBRL, formatRating, priceList, type Space } from '../lib/spaces'
import { primaryButton, secondaryButton } from '../lib/ui'
import { MapPinIcon, StarIcon } from './icons'

interface GoogleMapsExplorerProps {
    spaces: Space[]
    activeSearch: string
    onSelectHub: (query: string) => void
}

export default function GoogleMapsExplorer({
    spaces,
    activeSearch,
    onSelectHub,
}: GoogleMapsExplorerProps) {
    const [selectedId, setSelectedId] = useState<number | null>(null)

    const selected = useMemo(() => {
        if (spaces.length === 0) return null
        return spaces.find((s) => s.id === selectedId) ?? spaces[0]
    }, [spaces, selectedId])

    const embedSrc = selected
        ? getGoogleMapsEmbedUrl(selected)
        : getSaoPauloCityMapEmbedUrl(activeSearch)

    const mainPrice = selected
        ? selected.is_free
            ? 'Gratuito'
            : (() => {
                  const list = priceList(selected)
                  return list[0] ? `${formatBRL(list[0].value)}${list[0].unit}` : 'Sob consulta'
              })()
        : null

    return (
        <section
            aria-label="Mapa Google Maps de coworkings em São Paulo"
            className="space-y-4"
        >
            {/* Atalhos de regiões de São Paulo */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                            <MapPinIcon className="h-4 w-4" />
                        </span>
                        <div>
                            <h3 className="text-sm font-bold text-slate-900">
                                Google Maps · Base São Paulo 2026
                            </h3>
                            <p className="text-xs text-slate-500">
                                Selecione um polo de SP ou clique em um coworking para localizar no mapa.
                            </p>
                        </div>
                    </div>
                </div>
                <div
                    role="group"
                    aria-label="Polos de coworking em São Paulo"
                    className="mt-3 flex flex-wrap gap-1.5"
                >
                    {SAO_PAULO_HUBS.map((hub) => {
                        const isActive =
                            activeSearch.trim().toLowerCase() === hub.query.toLowerCase()
                        return (
                            <button
                                key={hub.label}
                                type="button"
                                aria-pressed={isActive}
                                onClick={() => onSelectHub(hub.query)}
                                className={`rounded-full border px-3 py-1 text-xs font-semibold transition cursor-pointer ${
                                    isActive
                                        ? 'border-indigo-600 bg-indigo-600 text-white shadow-xs'
                                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700'
                                }`}
                            >
                                {hub.label}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Split View: Lista de Empresas + Google Maps */}
            <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
                {/* Lista lateral */}
                <div className="max-h-[540px] space-y-2.5 overflow-y-auto pr-1">
                    {spaces.map((space) => {
                        const isSelected = selected?.id === space.id
                        const firstPrice = space.is_free
                            ? 'Gratuito'
                            : (() => {
                                  const p = priceList(space)[0]
                                  return p ? `${formatBRL(p.value)}${p.unit}` : 'Sob consulta'
                              })()

                        return (
                            <button
                                key={space.id}
                                type="button"
                                onClick={() => setSelectedId(space.id)}
                                aria-pressed={isSelected}
                                className={`w-full rounded-2xl border p-4 text-left transition cursor-pointer ${
                                    isSelected
                                        ? 'border-indigo-500 bg-indigo-50/70 ring-2 ring-indigo-500/20'
                                        : 'border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/70'
                                }`}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <h4 className="font-display text-sm font-bold text-slate-900 line-clamp-1">
                                        {space.name}
                                    </h4>
                                    <span
                                        className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                            space.is_free
                                                ? 'bg-emerald-100 text-emerald-700'
                                                : 'bg-slate-100 text-slate-800'
                                        }`}
                                    >
                                        {firstPrice}
                                    </span>
                                </div>
                                <p className="mt-1 flex items-center gap-1 text-xs text-slate-600 line-clamp-1">
                                    <MapPinIcon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                                    <span>
                                        {space.neighborhood ? `${space.neighborhood}, ` : ''}
                                        {space.city} — {space.state}
                                    </span>
                                </p>
                                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                                    <span className="inline-flex items-center gap-1">
                                        {space.rating_avg !== null ? (
                                            <>
                                                <StarIcon className="h-3.5 w-3.5 text-amber-400" />
                                                <strong className="text-slate-700">
                                                    {formatRating(space.rating_avg)}
                                                </strong>
                                                <span>({space.reviews_count})</span>
                                            </>
                                        ) : (
                                            <span>Novo espaço</span>
                                        )}
                                    </span>
                                    {hasCoordinates(space) && (
                                        <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-medium text-emerald-700">
                                            GPS verificado
                                        </span>
                                    )}
                                </div>
                            </button>
                        )
                    })}
                </div>

                {/* Mapa Google Maps + Card de ação do espaço selecionado */}
                <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-sm flex flex-col">
                    <div className="relative h-[380px] sm:h-[420px] w-full bg-slate-100">
                        <iframe
                            title={
                                selected
                                    ? `Mapa Google Maps de ${selected.name}`
                                    : 'Mapa Google Maps de Coworkings em São Paulo'
                            }
                            src={embedSrc}
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                            className="h-full w-full border-0"
                        />
                    </div>

                    {selected && (
                        <div className="flex flex-col gap-3 border-t border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h4 className="truncate font-display text-base font-bold text-slate-900">
                                        {selected.name}
                                    </h4>
                                    {mainPrice && (
                                        <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
                                            {mainPrice}
                                        </span>
                                    )}
                                </div>
                                <p className="mt-0.5 truncate text-xs text-slate-600">
                                    {formatAddress(selected)}
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2 shrink-0">
                                <a
                                    href={getGoogleMapsDirectionsUrl(selected)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`${secondaryButton} !h-9 !rounded-xl !px-3 text-xs`}
                                >
                                    Como chegar
                                </a>
                                <a
                                    href={getGoogleMapsPlaceUrl(selected)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`${secondaryButton} !h-9 !rounded-xl !px-3 text-xs`}
                                >
                                    Google Maps
                                </a>
                                <a
                                    href={href('space-detail', selected.id)}
                                    className={`${primaryButton} !h-9 !rounded-xl !px-3.5 text-xs`}
                                >
                                    Ver e reservar
                                </a>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </section>
    )
}
