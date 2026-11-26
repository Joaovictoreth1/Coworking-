import { request, tokenStorage } from './api'
import type { AdminMetrics, Booking, Paginated } from './spaces'

/* ------------------------------ Tipos ------------------------------ */

export interface BookingPayload {
    start_time: string
    end_time: string
    notes?: string
}

export interface BookingPreviewResult {
    available: boolean
    conflict?: boolean
    total_price: number
    duration_hours: number
    message: string
    errors?: Record<string, string[]>
}

export interface BookingAvailabilitySlot {
    start_time: string
    end_time: string
}

export interface BookingAvailabilityResult {
    date: string
    timezone: string
    open: boolean
    window: { from: string; to: string } | null
    busy: BookingAvailabilitySlot[]
}

export interface AdminBookingFilters {
    status?: string
    space_id?: number
    search?: string
    page?: number
}

/* ------------------------------- API ------------------------------- */

// A API de reserva mora ao lado dos seus tipos (Booking/AdminMetrics em spaces.ts),
// com respostas totalmente tipadas — sem `unknown` nem casts nos hooks.
export const bookingsApi = {
    availability: (spaceId: number, date: string) =>
        request<BookingAvailabilityResult>(
            `/spaces/${spaceId}/bookings/availability?date=${encodeURIComponent(date)}`,
        ),

    preview: (spaceId: number, data: { start_time: string; end_time: string }) =>
        request<BookingPreviewResult>(`/spaces/${spaceId}/bookings/preview`, {
            method: 'POST',
            body: data,
        }),

    create: (spaceId: number, data: BookingPayload) =>
        request<{ data: Booking }>(`/spaces/${spaceId}/bookings`, {
            method: 'POST',
            body: data,
            token: tokenStorage.get(),
        }),

    list: (status?: string) => {
        const query = status ? `?status=${encodeURIComponent(status)}` : ''
        return request<{ data: Booking[] }>(`/bookings${query}`, {
            token: tokenStorage.get(),
        })
    },

    get: (id: number) =>
        request<{ data: Booking }>(`/bookings/${id}`, {
            token: tokenStorage.get(),
        }),

    cancel: (id: number, reason?: string) =>
        request<{ message: string; booking: Booking }>(`/bookings/${id}/cancel`, {
            method: 'POST',
            body: { reason },
            token: tokenStorage.get(),
        }),

    adminList: (params?: AdminBookingFilters) => {
        const sp = new URLSearchParams()
        if (params?.status) sp.set('status', params.status)
        if (params?.space_id) sp.set('space_id', String(params.space_id))
        if (params?.search) sp.set('search', params.search)
        if (params?.page) sp.set('page', String(params.page))
        const q = sp.toString() ? `?${sp.toString()}` : ''
        return request<Paginated<Booking>>(`/admin/bookings${q}`, {
            token: tokenStorage.get(),
        })
    },

    adminUpdateStatus: (id: number, status: string, notes?: string) =>
        request<{ message: string; booking: Booking }>(`/admin/bookings/${id}/status`, {
            method: 'PATCH',
            body: { status, notes },
            token: tokenStorage.get(),
        }),

    adminMetrics: () =>
        request<AdminMetrics>('/admin/metrics', {
            token: tokenStorage.get(),
        }),
}
