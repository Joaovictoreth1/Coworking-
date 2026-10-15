import { request, tokenStorage } from './api'

/* ------------------------------ Tipos ------------------------------ */

export interface DaySchedule {
    day: number // 0 = domingo ... 6 = sábado
    enabled: boolean
    from: string // "HH:MM"
    to: string
}

export interface SpacePhoto {
    id: number
    url: string
}

export interface Space {
    id: number
    name: string
    description: string | null
    capacity: number | null
    zip_code: string | null
    street: string
    number: string | null
    complement: string | null
    neighborhood: string | null
    city: string
    state: string
    hourly_price: number | null
    daily_price: number | null
    monthly_price: number | null
    is_free: boolean
    rating_avg: number | null
    reviews_count: number
    is_favorite: boolean
    owner_id: number
    opening_hours: DaySchedule[]
    availability: DaySchedule[]
    amenities: string[]
    is_active: boolean
    owner?: { id: number; name: string } // só na listagem
    photos: SpacePhoto[]
    cover_url: string | null
    created_at: string
    updated_at: string
}

export type SpacePayload = Omit<
    Space,
    | 'id'
    | 'owner'
    | 'owner_id'
    | 'photos'
    | 'cover_url'
    | 'created_at'
    | 'updated_at'
    | 'rating_avg'
    | 'reviews_count'
    | 'is_favorite'
>

export interface Paginated<T> {
    data: T[]
    meta: { current_page: number; last_page: number; per_page: number; total: number }
}

/** Foto na tela do formulário: já salva (id) ou escolhida agora (file). */
export interface PhotoItem {
    key: string
    url: string
    id?: number
    file?: File
}

export const MAX_PHOTOS = 10

export interface Review {
    id: number
    rating: number
    comment: string | null
    author: string
    is_mine: boolean
    created_at: string
    updated_at: string
}

export interface ReviewSummary {
    average: number | null
    count: number
    distribution: Record<number, number> // nota (1-5) -> quantidade
}

/* --------------------------- Constantes --------------------------- */

export type PriceType = 'free' | 'hourly' | 'daily' | 'monthly'
export type SortKey = 'recent' | 'price_asc' | 'price_desc' | 'rating'

export const PRICE_TYPES: { value: PriceType | ''; label: string; unit: string }[] = [
    { value: '', label: 'Todos', unit: '' },
    { value: 'hourly', label: 'Por hora', unit: '/hora' },
    { value: 'daily', label: 'Diária', unit: '/dia' },
    { value: 'monthly', label: 'Mensal', unit: '/mês' },
    { value: 'free', label: 'Gratuitos', unit: '' },
]

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
    { value: 'recent', label: 'Mais recentes' },
    { value: 'price_asc', label: 'Menor preço' },
    { value: 'price_desc', label: 'Maior preço' },
    { value: 'rating', label: 'Melhor avaliados' },
]

// Ordem de exibição: segunda a domingo
export const WEEKDAYS = [
    { day: 1, label: 'Segunda-feira', short: 'Seg' },
    { day: 2, label: 'Terça-feira', short: 'Ter' },
    { day: 3, label: 'Quarta-feira', short: 'Qua' },
    { day: 4, label: 'Quinta-feira', short: 'Qui' },
    { day: 5, label: 'Sexta-feira', short: 'Sex' },
    { day: 6, label: 'Sábado', short: 'Sáb' },
    { day: 0, label: 'Domingo', short: 'Dom' },
]

export const defaultSchedule = (): DaySchedule[] =>
    WEEKDAYS.map(({ day }) => ({ day, enabled: day >= 1 && day <= 5, from: '08:00', to: '18:00' }))

export const AMENITIES = [
    { id: 'wifi', label: 'Wi-Fi rápido' },
    { id: 'air_conditioning', label: 'Ar-condicionado' },
    { id: 'coffee', label: 'Café' },
    { id: 'call_booths', label: 'Cabines de call' },
    { id: 'meeting_rooms', label: 'Salas de reunião' },
    { id: 'projector', label: 'Projetor / TV' },
    { id: 'whiteboard', label: 'Lousa / quadro branco' },
    { id: 'printer', label: 'Impressora' },
    { id: 'kitchen', label: 'Cozinha / copa' },
    { id: 'parking', label: 'Estacionamento' },
    { id: 'reception', label: 'Recepção' },
    { id: 'lockers', label: 'Armários' },
    { id: 'accessibility', label: 'Acessibilidade' },
    { id: 'security', label: 'Segurança 24h' },
]

export const amenityLabel = (value: string) =>
    AMENITIES.find((a) => a.id === value)?.label ?? value

export const STATES = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
    'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]

/* --------------------------- Formatação --------------------------- */

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export const formatBRL = (value: number) => brl.format(value)

const dateFormat = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })

export const formatDate = (iso: string) => dateFormat.format(new Date(iso))

/** 4.5 -> "4,5" */
export const formatRating = (value: number) => value.toFixed(1).replace('.', ',')

/** Preços cobrados pelo local, na ordem hora, dia, mês (vazio se for gratuito). */
export function priceList(space: Pick<Space, 'hourly_price' | 'daily_price' | 'monthly_price'>) {
    return [
        space.hourly_price !== null && { key: 'hourly', value: space.hourly_price, unit: '/hora', label: 'Por hora' },
        space.daily_price !== null && { key: 'daily', value: space.daily_price, unit: '/dia', label: 'Por dia' },
        space.monthly_price !== null && { key: 'monthly', value: space.monthly_price, unit: '/mês', label: 'Mensal' },
    ].filter((p): p is { key: string; value: number; unit: string; label: string } => p !== false)
}

/** "A, B e C" */
export function joinList(items: string[]): string {
    if (items.length <= 1) return items.join('')
    return `${items.slice(0, -1).join(', ')} e ${items[items.length - 1]}`
}

/** "1.234,50" | "35,5" | "35.5" -> número (ou null se vazio/inválido) */
export function parseMoney(text: string): number | null {
    let t = text.replace(/[^\d.,]/g, '')
    if (!t) return null
    if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.')
    const n = Number(t)
    return Number.isFinite(n) ? n : null
}

export const moneyToInput = (value: number | null) =>
    value === null ? '' : value.toFixed(2).replace('.', ',')

export function formatAddress(s: Pick<Space, 'street' | 'number' | 'neighborhood' | 'city' | 'state'>) {
    const line = [s.number ? `${s.street}, ${s.number}` : s.street, s.neighborhood]
        .filter(Boolean)
        .join(' – ')
    return `${line} · ${s.city}/${s.state}`
}

/** Ex.: "Seg a Sex, 08:00–18:00" (ou "5 dias/semana" quando os horários variam) */
export function summarizeSchedule(schedule: DaySchedule[]): string {
    const byDay = new Map(schedule.map((d) => [d.day, d]))
    const active = WEEKDAYS.map((w, index) => ({ ...w, index, entry: byDay.get(w.day) })).filter(
        (w) => w.entry?.enabled,
    )
    if (active.length === 0) return 'Nenhum dia'

    const first = active[0].entry!
    const sameHours = active.every((w) => w.entry!.from === first.from && w.entry!.to === first.to)
    const contiguous = active.every((w, i) => i === 0 || w.index === active[i - 1].index + 1)

    const days =
        contiguous && active.length > 2
            ? `${active[0].short} a ${active[active.length - 1].short}`
            : active.map((w) => w.short).join(', ')

    return sameHours ? `${days}, ${first.from}–${first.to}` : `${days} (horários variados)`
}

/* ------------------------------ Fotos ------------------------------ */

/** Reduz a foto (lado maior ≤ 1600px, JPEG) para o upload ficar leve e caber no limite do servidor. */
export async function compressImage(file: File, maxSide = 1600, quality = 0.85): Promise<File> {
    try {
        const bitmap = await createImageBitmap(file)
        const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(bitmap.width * scale)
        canvas.height = Math.round(bitmap.height * scale)

        const ctx = canvas.getContext('2d')
        if (!ctx) return file
        ctx.fillStyle = '#ffffff' // PNG com transparência vira fundo branco no JPEG
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
        bitmap.close()

        const blob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob(resolve, 'image/jpeg', quality),
        )
        if (!blob || (scale === 1 && blob.size >= file.size)) return file

        return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' })
    } catch {
        return file
    }
}

/* ------------------------------- API ------------------------------- */

export interface SpaceFilters {
    page?: number
    q?: string
    priceType?: PriceType | ''
    minPrice?: string // texto digitado ("35,50")
    maxPrice?: string
    sort?: SortKey
}

function filtersToQuery(f: SpaceFilters): string {
    const qs = new URLSearchParams()
    if (f.page && f.page > 1) qs.set('page', String(f.page))
    if (f.q) qs.set('q', f.q)
    if (f.priceType) qs.set('price_type', f.priceType)
    if (f.priceType !== 'free') {
        const min = f.minPrice ? parseMoney(f.minPrice) : null
        const max = f.maxPrice ? parseMoney(f.maxPrice) : null
        if (min !== null) qs.set('min_price', String(min))
        if (max !== null) qs.set('max_price', String(max))
    }
    if (f.sort && f.sort !== 'recent') qs.set('sort', f.sort)
    const query = qs.toString()
    return query ? `?${query}` : ''
}

// Vitrine pública (só locais ativos). O token é opcional: com ele a API informa quais são favoritos.
export const publicSpacesApi = {
    list: (filters: SpaceFilters) =>
        request<Paginated<Space>>(`/spaces${filtersToQuery(filters)}`, { token: tokenStorage.get() }),

    get: (id: number) =>
        request<{ data: Space }>(`/spaces/${id}`, { token: tokenStorage.get() }).then((r) => r.data),
}

export const favoritesApi = {
    list: (page = 1) =>
        request<Paginated<Space>>(`/favorites${page > 1 ? `?page=${page}` : ''}`, {
            token: tokenStorage.get(),
        }),

    add: (spaceId: number) =>
        request<{ favorited: boolean }>(`/spaces/${spaceId}/favorite`, {
            method: 'POST',
            token: tokenStorage.get(),
        }),

    remove: (spaceId: number) =>
        request<{ favorited: boolean }>(`/spaces/${spaceId}/favorite`, {
            method: 'DELETE',
            token: tokenStorage.get(),
        }),
}

export interface ReviewsPage extends Paginated<Review> {
    summary: ReviewSummary
    mine: Review | null
}

export const reviewsApi = {
    list: (spaceId: number, page = 1) =>
        request<ReviewsPage>(`/spaces/${spaceId}/reviews${page > 1 ? `?page=${page}` : ''}`, {
            token: tokenStorage.get(),
        }),

    save: (spaceId: number, payload: { rating: number; comment: string | null }) =>
        request<{ data: Review; summary: ReviewSummary }>(`/spaces/${spaceId}/reviews`, {
            method: 'POST',
            body: payload,
            token: tokenStorage.get(),
        }),

    remove: (spaceId: number, reviewId: number) =>
        request<{ message: string; summary: ReviewSummary }>(
            `/spaces/${spaceId}/reviews/${reviewId}`,
            { method: 'DELETE', token: tokenStorage.get() },
        ),
}

const token = () => tokenStorage.get()

export const spacesApi = {
    list: (params: { page?: number; q?: string; status?: string }) => {
        const qs = new URLSearchParams()
        if (params.page && params.page > 1) qs.set('page', String(params.page))
        if (params.q) qs.set('q', params.q)
        if (params.status) qs.set('status', params.status)
        const query = qs.toString()
        return request<Paginated<Space>>(`/admin/spaces${query ? `?${query}` : ''}`, {
            token: token(),
        })
    },

    get: (id: number) =>
        request<{ data: Space }>(`/admin/spaces/${id}`, { token: token() }).then((r) => r.data),

    create: (payload: SpacePayload) =>
        request<{ data: Space }>('/admin/spaces', {
            method: 'POST',
            body: payload,
            token: token(),
        }).then((r) => r.data),

    update: (id: number, payload: SpacePayload) =>
        request<{ data: Space }>(`/admin/spaces/${id}`, {
            method: 'PUT',
            body: payload,
            token: token(),
        }).then((r) => r.data),

    remove: (id: number) =>
        request<{ message: string }>(`/admin/spaces/${id}`, {
            method: 'DELETE',
            token: token(),
        }),

    uploadPhotos: (id: number, files: File[]) => {
        const form = new FormData()
        files.forEach((file) => form.append('photos[]', file))
        return request<{ data: Space }>(`/admin/spaces/${id}/photos`, {
            method: 'POST',
            form,
            token: token(),
        }).then((r) => r.data)
    },

    deletePhoto: (spaceId: number, photoId: number) =>
        request<{ data: Space }>(`/admin/spaces/${spaceId}/photos/${photoId}`, {
            method: 'DELETE',
            token: token(),
        }).then((r) => r.data),

    reorderPhotos: (spaceId: number, ids: number[]) =>
        request<{ data: Space }>(`/admin/spaces/${spaceId}/photos/order`, {
            method: 'PUT',
            body: { ids },
            token: token(),
        }).then((r) => r.data),
}
