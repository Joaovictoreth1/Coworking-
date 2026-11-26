import { useMemo, useState } from 'react'
import {
    SAO_PAULO_HUBS,
    distanceKm,
    formatDistance,
    getGoogleMapsDirectionsUrl,
    getGoogleMapsEmbedUrl,
    getGoogleMapsPlaceUrl,
    getSaoPauloCityMapEmbedUrl,
    getWazeDirectionsUrl,
    hasCoordinates,
    type MapLayer,
} from '../lib/maps'
import { href } from '../lib/route'
import {
    amenityLabel,
    formatAddress,
    formatBRL,
    formatRating,
    priceList,
    type Space,
} from '../lib/spaces'
import { primaryButton, secondaryButton } from '../lib/ui'
import { MapPinIcon, StarIcon, UserIcon } from './icons'

interface GoogleMapsExplorerProps {
    spaces: Space[]
    activeSearch: string
    filtersOn?: boolean
    userCoords: { lat: number; lng: number } | null
    sortByDistance: boolean
    onUserCoordsChange: (coords: { lat: number; lng: number }) => void
    onToggleSortByDistance: () => void
    onSelectHub: (query: string) => void
    onClearAll?: () => void
}

export default function GoogleMapsExplorer({
    spaces,
    activeSearch,
    filtersOn = false,
    userCoords,
    sortByDistance,
    onUserCoordsChange,
    onToggleSortByDistance,
    onSelectHub,
    onClearAll,
}: GoogleMapsExplorerProps) {
    const [selectedId, setSelectedId] = useState<number | null>(null)
    const [locating, setLocating] = useState(false)
    const [geoError, setGeoError] = useState('')
    const [mapLayer, setMapLayer] = useState<MapLayer>('m')
    const [copiedAddress, setCopiedAddress] = useState(false)
    const todayDay = new Date().getDay()

    function handleLocateMe() {
        if (!('geolocation' in navigator)) {
            setGeoError('Seu navegador não suporta geolocalização.')
            return
        }
        setLocating(true)
        setGeoError('')
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                onUserCoordsChange({ lat: pos.coords.latitude, lng: pos.coords.longitude })
                setLocating(false)
            },
            () => {
                setGeoError('Não foi possível obter sua localização. Verifique a permissão do navegador.')
                setLocating(false)
            },
            { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
        )
    }

    const distances = useMemo(() => {
        const map = new Map<number, number>()
        if (!userCoords) return map
        for (const s of spaces) {
            if (hasCoordinates(s)) {
                map.set(s.id, distanceKm(userCoords.lat, userCoords.lng, s.latitude, s.longitude))
            }
        }
        return map
    }, [spaces, userCoords])

    const orderedSpaces = useMemo(() => {
        if (!sortByDistance || !userCoords) return spaces
        return [...spaces].sort((a, b) => {
            const da = distances.get(a.id) ?? Number.POSITIVE_INFINITY
            const db = distances.get(b.id) ?? Number.POSITIVE_INFINITY
            return da - db
        })
    }, [spaces, sortByDistance, userCoords, distances])

    const selected = useMemo(() => {
        if (orderedSpaces.length === 0) return null
        return orderedSpaces.find((s) => s.id === selectedId) ?? orderedSpaces[0]
    }, [orderedSpaces, selectedId])

    const embedSrc = selected
        ? getGoogleMapsEmbedUrl(selected, 16, mapLayer)
        : getSaoPauloCityMapEmbedUrl(activeSearch, mapLayer)

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
                                Selecione um polo de SP, use sua localização ou clique em um coworking para localizar no mapa.
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <div
                            role="group"
                            aria-label="Camada do mapa"
                            className="inline-flex h-8 rounded-xl border border-slate-200 bg-slate-50 p-0.5"
                        >
                            <button
                                type="button"
                                aria-pressed={mapLayer === 'm'}
                                onClick={() => setMapLayer('m')}
                                className={`rounded-lg px-2.5 text-xs font-semibold transition cursor-pointer ${
                                    mapLayer === 'm'
                                        ? 'bg-indigo-600 text-white shadow-xs'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                Mapa
                            </button>
                            <button
                                type="button"
                                aria-pressed={mapLayer === 'k'}
                                onClick={() => setMapLayer('k')}
                                className={`rounded-lg px-2.5 text-xs font-semibold transition cursor-pointer ${
                                    mapLayer === 'k'
                                        ? 'bg-indigo-600 text-white shadow-xs'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                Satélite
                            </button>
                        </div>
                        <button
                            type="button"
                            onClick={handleLocateMe}
                            disabled={locating}
                            className={`inline-flex h-8 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition cursor-pointer disabled:opacity-60 ${
                                userCoords
                                    ? 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                                    : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700'
                            }`}
                        >
                            <MapPinIcon className="h-3.5 w-3.5" />
                            {locating
                                ? 'Localizando...'
                                : userCoords
                                  ? 'Atualizar localização'
                                  : 'Perto de mim'}
                        </button>
                        {userCoords && (
                            <button
                                type="button"
                                aria-pressed={sortByDistance}
                                onClick={onToggleSortByDistance}
                                className={`inline-flex h-8 items-center rounded-xl border px-3 text-xs font-semibold transition cursor-pointer ${
                                    sortByDistance
                                        ? 'border-indigo-600 bg-indigo-600 text-white'
                                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                }`}
                            >
                                Mais próximos
                            </button>
                        )}
                    </div>
                </div>
                {geoError && (
                    <p role="alert" className="mt-2 text-xs font-medium text-amber-700">
                        {geoError}
                    </p>
                )}
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
                    {spaces.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center">
                            <p className="font-display text-base font-semibold text-slate-900">
                                Nenhum coworking neste filtro
                            </p>
                            <p className="mt-1 text-xs text-slate-600">
                                Escolha outro polo de São Paulo acima ou limpe os filtros ativos.
                            </p>
                            {filtersOn && onClearAll && (
                                <button
                                    type="button"
                                    onClick={onClearAll}
                                    className={`${secondaryButton} mt-4 !h-9 !rounded-xl !px-3.5 text-xs`}
                                >
                                    Limpar busca e filtros
                                </button>
                            )}
                        </div>
                    ) : (
                        orderedSpaces.map((space) => {
                            const isSelected = selected?.id === space.id
                            const dist = distances.get(space.id)
                            const todayHours = space.opening_hours?.find(
                                (d) => d.day === todayDay && d.enabled,
                            )
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
                                        <span className="inline-flex items-center gap-1.5">
                                            {dist !== undefined && (
                                                <span className="rounded bg-indigo-50 px-1.5 py-0.5 font-semibold text-indigo-700">
                                                    {formatDistance(dist)}
                                                </span>
                                            )}
                                            {todayHours && (
                                                <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600">
                                                    Hoje {todayHours.from}–{todayHours.to}
                                                </span>
                                            )}
                                            {hasCoordinates(space) && (
                                                <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-medium text-emerald-700">
                                                    GPS verificado
                                                </span>
                                            )}
                                        </span>
                                    </div>
                                </button>
                            )
                        })
                    )}
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
                                    {distances.get(selected.id) !== undefined && (
                                        <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                                            a {formatDistance(distances.get(selected.id)!)}
                                        </span>
                                    )}
                                </div>
                                <p className="mt-0.5 truncate text-xs text-slate-600">
                                    {formatAddress(selected)}
                                </p>
                                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600">
                                    {selected.capacity !== null && (
                                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 font-medium">
                                            <UserIcon className="h-3 w-3 text-slate-500" />
                                            Até {selected.capacity} pessoas
                                        </span>
                                    )}
                                    {selected.amenities.slice(0, 3).map((a) => (
                                        <span
                                            key={a}
                                            className="rounded-md bg-slate-100 px-2 py-0.5 font-medium"
                                        >
                                            {amenityLabel(a)}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => {
                                        void navigator.clipboard?.writeText(formatAddress(selected))
                                        setCopiedAddress(true)
                                        setTimeout(() => setCopiedAddress(false), 2000)
                                    }}
                                    className={`${secondaryButton} !h-9 !rounded-xl !px-3 text-xs`}
                                >
                                    {copiedAddress ? 'Copiado!' : 'Copiar endereço'}
                                </button>
                                <a
                                    href={getWazeDirectionsUrl(selected)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`${secondaryButton} !h-9 !rounded-xl !px-3 text-xs`}
                                >
                                    Waze
                                </a>
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
