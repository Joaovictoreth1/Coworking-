import { ApiError } from './api'
import { parseMoney } from './spaces'
import type { DaySchedule, Paginated, Space, SpaceFilters } from './spaces'
import catalog from './staticSpaces.json'

type Hours = Pick<DaySchedule, 'from' | 'to'>
type CatalogEntry = Pick<Space, 'id' | 'name' | 'description' | 'street' | 'number' | 'neighborhood'> &
    Partial<Pick<Space, 'zip_code' | 'complement' | 'hourly_price' | 'daily_price' | 'monthly_price' | 'is_free' | 'amenities'>> & {
        source_url: string
        weekday_hours?: Hours
        saturday_hours?: Hours
    }

const pageSize = 15

const spaces: Space[] = (catalog satisfies CatalogEntry[]).map((entry: CatalogEntry) => {
    const { weekday_hours: weekday, saturday_hours: saturday, ...venue } = entry
    return {
        capacity: null,
        zip_code: null,
        complement: null,
        city: 'São Paulo',
        state: 'SP',
        hourly_price: null,
        daily_price: null,
        monthly_price: null,
        is_free: false,
        rating_avg: null,
        reviews_count: 0,
        is_favorite: false,
        owner_id: 0,
        opening_hours: weekday ? Array.from({ length: 7 }, (_, day) => {
            const hours = day === 6 ? saturday : day === 0 ? undefined : weekday
            return { day, enabled: !!hours, from: hours?.from ?? '', to: hours?.to ?? '' }
        }) : [],
        availability: [],
        amenities: [],
        is_active: true,
        photos: [],
        cover_url: null,
        created_at: '',
        updated_at: '',
        ...venue,
    }
})

function normalize(value: string): string {
    return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('pt-BR').trim()
}

function prices(space: Space, type: SpaceFilters['priceType']): number[] {
    if (type === 'free') return space.is_free ? [0] : []
    if (type) {
        const price = space[`${type}_price`]
        return price === null ? [] : [price]
    }
    if (space.is_free) return [0]
    return [space.hourly_price, space.daily_price, space.monthly_price].filter((price) => price !== null)
}

export function listStaticSpaces(filters: SpaceFilters): Paginated<Space> {
    const term = normalize(filters.q ?? '')
    let min = parseMoney(filters.minPrice ?? '')
    let max = parseMoney(filters.maxPrice ?? '')
    if (min !== null && max !== null && min > max) [min, max] = [max, min]
    const hasRange = filters.priceType !== 'free' && (min !== null || max !== null)

    const results = spaces.filter((space) => {
        if (term && ![space.name, space.street, space.neighborhood, space.city].some((value) =>
            value && normalize(value).includes(term),
        )) return false
        if (!filters.priceType && !hasRange) return true

        return prices(space, filters.priceType).some((price) =>
            !hasRange || (price >= (min ?? 0) && price <= (max ?? Infinity)),
        )
    })

    const sort = filters.sort
    if (sort === 'price_asc' || sort === 'price_desc') {
        results.sort((a, b) => {
            const first = Math.min(...prices(a, filters.priceType))
            const second = Math.min(...prices(b, filters.priceType))
            if (first === second) return 0
            if (first === Infinity) return 1
            if (second === Infinity) return -1
            return sort === 'price_asc' ? first - second : second - first
        })
    }

    const page = filters.page ?? 1
    return {
        data: results.slice((page - 1) * pageSize, page * pageSize),
        meta: { current_page: page, last_page: Math.max(1, Math.ceil(results.length / pageSize)), per_page: pageSize, total: results.length },
    }
}

export function getStaticSpace(id: number): Space {
    const space = spaces.find((venue) => venue.id === id)
    if (!space) throw new ApiError('Local não encontrado.', 404)
    return space
}
