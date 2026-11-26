import { formatAddress, type Space } from './spaces'

export const SAO_PAULO_HUBS = [
    { label: 'São Paulo (Todos)', query: 'São Paulo' },
    { label: 'Paulista', query: 'Paulista' },
    { label: 'Faria Lima', query: 'Faria Lima' },
    { label: 'Pinheiros', query: 'Pinheiros' },
    { label: 'Vila Olímpia', query: 'Vila Olímpia' },
    { label: 'Itaim Bibi', query: 'Itaim Bibi' },
    { label: 'Paraíso', query: 'Paraíso' },
    { label: 'Berrini', query: 'Berrini' },
    { label: 'Moema', query: 'Moema' },
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
): string {
    const query = buildMapsQuery(space)
    return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=${zoom}&hl=pt-BR&output=embed`
}

export function getSaoPauloCityMapEmbedUrl(neighborhood?: string): string {
    const normalized = neighborhood?.trim().toLowerCase() ?? ''
    const matchedHub = SAO_PAULO_HUBS.find(
        (hub) => hub.query.toLowerCase() === normalized && hub.query !== 'São Paulo',
    )
    const query = matchedHub
        ? `${matchedHub.query}, São Paulo, SP, Brasil`
        : 'São Paulo, SP, Brasil'
    const zoom = matchedHub ? 14 : 12
    return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=${zoom}&hl=pt-BR&output=embed`
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
