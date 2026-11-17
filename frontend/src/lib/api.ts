export const API_URL: string =
    import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api'

const TOKEN_KEY = 'auth_token'

export const tokenStorage = {
    get: () => localStorage.getItem(TOKEN_KEY),
    set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
    clear: () => localStorage.removeItem(TOKEN_KEY),
}

export interface User {
    id: number
    name: string
    email: string
    role: 'admin' | 'user'
    is_admin: boolean
}

interface AuthResponse {
    user: User
    token: string
}

export class ApiError extends Error {
    status: number
    errors: Record<string, string[]>

    constructor(message: string, status: number, errors: Record<string, string[]> = {}) {
        super(message)
        this.status = status
        this.errors = errors
    }
}

export async function request<T>(
    path: string,
    options: { method?: string; body?: unknown; form?: FormData; token?: string | null } = {},
): Promise<T> {
    const headers: Record<string, string> = { Accept: 'application/json' }
    // Com FormData o navegador define o Content-Type (com o boundary) sozinho
    if (options.body !== undefined) headers['Content-Type'] = 'application/json'
    if (options.token) headers.Authorization = `Bearer ${options.token}`

    let res: Response
    try {
        res = await fetch(`${API_URL}${path}`, {
            method: options.method ?? 'GET',
            headers,
            body:
                options.form ??
                (options.body !== undefined ? JSON.stringify(options.body) : undefined),
        })
    } catch {
        throw new ApiError('Não foi possível conectar ao servidor.', 0)
    }

    const data = await res.json().catch(() => null)

    if (!res.ok) {
        throw new ApiError(data?.message ?? 'Erro inesperado.', res.status, data?.errors ?? {})
    }

    return data as T
}

export const authApi = {
    login: (email: string, password: string) =>
        request<AuthResponse>('/auth/login', {
            method: 'POST',
            body: { email, password, device_name: 'web' },
        }),

    register: (data: {
        name: string
        email: string
        password: string
        password_confirmation: string
    }) =>
        request<AuthResponse>('/auth/register', {
            method: 'POST',
            body: { ...data, device_name: 'web' },
        }),

    me: (token: string) => request<{ user: User }>('/auth/me', { token }),

    logout: (token: string) =>
        request<{ message: string }>('/auth/logout', { method: 'POST', token }),
}

export interface BookingPayload {
    start_time: string
    end_time: string
    notes?: string
}

export interface BookingPreviewResult {
    available: boolean
    total_price: number
    duration_hours: number
    message: string
    errors?: Record<string, string[]>
}

export const bookingsApi = {
    preview: (spaceId: number, data: { start_time: string; end_time: string }) =>
        request<BookingPreviewResult>(`/spaces/${spaceId}/bookings/preview`, {
            method: 'POST',
            body: data,
        }),

    create: (spaceId: number, data: BookingPayload) =>
        request<{ data: unknown }>(`/spaces/${spaceId}/bookings`, {
            method: 'POST',
            body: data,
            token: tokenStorage.get(),
        }),

    list: (status?: string) => {
        const query = status ? `?status=${encodeURIComponent(status)}` : ''
        return request<{ data: unknown[] }>(`/bookings${query}`, {
            token: tokenStorage.get(),
        })
    },

    get: (id: number) =>
        request<{ data: unknown }>(`/bookings/${id}`, {
            token: tokenStorage.get(),
        }),

    cancel: (id: number, reason?: string) =>
        request<{ message: string; booking: unknown }>(`/bookings/${id}/cancel`, {
            method: 'POST',
            body: { reason },
            token: tokenStorage.get(),
        }),

    adminList: (params?: { status?: string; space_id?: number; search?: string; page?: number }) => {
        const sp = new URLSearchParams()
        if (params?.status) sp.set('status', params.status)
        if (params?.space_id) sp.set('space_id', String(params.space_id))
        if (params?.search) sp.set('search', params.search)
        if (params?.page) sp.set('page', String(params.page))
        const q = sp.toString() ? `?${sp.toString()}` : ''
        return request<{ data: unknown[]; meta?: { current_page: number; last_page: number; total: number } }>(
            `/admin/bookings${q}`,
            { token: tokenStorage.get() },
        )
    },

    adminUpdateStatus: (id: number, status: string, notes?: string) =>
        request<{ message: string; booking: unknown }>(`/admin/bookings/${id}/status`, {
            method: 'PATCH',
            body: { status, notes },
            token: tokenStorage.get(),
        }),

    adminMetrics: () =>
        request<unknown>('/admin/metrics', {
            token: tokenStorage.get(),
        }),
}
