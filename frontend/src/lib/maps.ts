import { formatAddress, type Space } from './spaces'

export type MapLayer = 'm' | 'k'

export const SAO_PAULO_HUBS = [
    { label: 'São Paulo (Todos)', query: 'São Paulo' },
    { label: 'Paulista', query: 'Paulista' },
    { label: 'Faria Lima', query: 'Faria Lima' },
    { label: 'Pinheiros', query: 'Pinheiros' },
    { label: 'Vila Madalena', query: 'Vila Madalena' },
    { label: 'Jardins', query: 'Jardins' },
    { label: 'Vila Olímpia', query: 'Vila Olímpia' },
    { label: 'Itaim Bibi', query: 'Itaim Bibi' },
    { label: 'Brooklin', query: 'Brooklin' },
    { label: 'Berrini', query: 'Berrini' },
    { label: 'Paraíso', query: 'Paraíso' },
    { label: 'Vila Mariana', query: 'Vila Mariana' },
    { label: 'Moema', query: 'Moema' },
    { label: 'Higienópolis', query: 'Higienópolis' },
    { label: 'República', query: 'República' },
    { label: 'Tatuapé', query: 'Tatuapé' },
    { label: 'Santana', query: 'Santana' },
    { label: 'Vila Leopoldina', query: 'Vila Leopoldina' },
] as const

export function hasCoordinates(
    space: Pick<Space, 'latitude' | 'longitude'>,
): space is Pick<Space, 'latitude' | 'longitude'> & { latitude: number; longitude: number } {
    return typeof space.latitude === 'number' && typeof space.longitude === 'number'
}

export function buildMapsQuery(
    space: Pick<Space, 'name' | 'street' | 'number' | 'neighborhood' | 'city' | 'state' | 'latitude' | 'longitude'>,
): string {
    if (hasCoordinates(space)) {
        return `${space.latitude},${space.longitude}`
    }
    const address = formatAddress(space)
    return `${space.name}, ${address}, Brasil`
}

export function getGoogleMapsEmbedUrl(
    space: Pick<Space, 'name' | 'street' | 'number' | 'neighborhood' | 'city' | 'state' | 'latitude' | 'longitude'>,
    zoom = 16,
    layer: MapLayer = 'm',
): string {
    const query = buildMapsQuery(space)
    return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=${zoom}&t=${layer}&hl=pt-BR&output=embed`
}

export function getSaoPauloCityMapEmbedUrl(neighborhood?: string, layer: MapLayer = 'm'): string {
    const normalized = neighborhood?.trim().toLowerCase() ?? ''
    const matchedHub = SAO_PAULO_HUBS.find(
        (hub) => hub.query.toLowerCase() === normalized && hub.query !== 'São Paulo',
    )
    const query = matchedHub
        ? `${matchedHub.query}, São Paulo, SP, Brasil`
        : 'São Paulo, SP, Brasil'
    const zoom = matchedHub ? 14 : 12
    return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=${zoom}&t=${layer}&hl=pt-BR&output=embed`
}

export function getGoogleMapsPlaceUrl(
    space: Pick<Space, 'name' | 'street' | 'number' | 'neighborhood' | 'city' | 'state' | 'latitude' | 'longitude'>,
): string {
    const query = buildMapsQuery(space)
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

export function getGoogleMapsDirectionsUrl(
    space: Pick<Space, 'name' | 'street' | 'number' | 'neighborhood' | 'city' | 'state' | 'latitude' | 'longitude'>,
): string {
    const destination = buildMapsQuery(space)
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`
}

export function getWazeDirectionsUrl(
    space: Pick<Space, 'name' | 'street' | 'number' | 'neighborhood' | 'city' | 'state' | 'latitude' | 'longitude'>,
): string {
    if (hasCoordinates(space)) {
        return `https://waze.com/ul?ll=${space.latitude},${space.longitude}&navigate=yes`
    }
    return `https://waze.com/ul?q=${encodeURIComponent(buildMapsQuery(space))}&navigate=yes`
}

export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const toRad = (deg: number) => (deg * Math.PI) / 180
    const dLat = toRad(lat2 - lat1)
    const dLng = toRad(lng2 - lng1)
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function formatDistance(km: number): string {
    if (km < 1) return `${Math.round(km * 1000)} m`
    return `${km.toFixed(1).replace('.', ',')} km`
}
