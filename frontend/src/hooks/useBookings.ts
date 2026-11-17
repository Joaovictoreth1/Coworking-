import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError, bookingsApi, type BookingPayload, type BookingPreviewResult } from '../lib/api'
import type { AdminMetrics, Booking, Paginated } from '../lib/spaces'
import { toast } from '../store/useToastStore'

export function useUserBookingsQuery(status?: string) {
    return useQuery<Booking[]>({
        queryKey: ['bookings', status ?? 'all'],
        queryFn: async () => {
            const res = await bookingsApi.list(status)
            return (res.data as unknown) as Booking[]
        },
    })
}

export function useBookingPreviewQuery(
    spaceId: number,
    startTime: string,
    endTime: string,
    enabled = false,
) {
    return useQuery<BookingPreviewResult>({
        queryKey: ['booking-preview', spaceId, startTime, endTime],
        queryFn: async () => {
            return await bookingsApi.preview(spaceId, {
                start_time: startTime,
                end_time: endTime,
            })
        },
        enabled: enabled && Boolean(spaceId && startTime && endTime),
        retry: false,
    })
}

export function useCreateBookingMutation(spaceId: number) {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (payload: BookingPayload) => {
            return await bookingsApi.create(spaceId, payload)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bookings'] })
            queryClient.invalidateQueries({ queryKey: ['admin-bookings'] })
            queryClient.invalidateQueries({ queryKey: ['admin-metrics'] })
            toast.success('Reserva confirmada com sucesso! 🚀')
        },
        onError: (err: unknown) => {
            const message = err instanceof ApiError ? err.message : 'Falha ao confirmar reserva.'
            toast.error(message)
        },
    })
}

export function useCancelBookingMutation() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ bookingId, reason }: { bookingId: number; reason?: string }) => {
            return await bookingsApi.cancel(bookingId, reason)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bookings'] })
            queryClient.invalidateQueries({ queryKey: ['admin-bookings'] })
            queryClient.invalidateQueries({ queryKey: ['admin-metrics'] })
            toast.success('Reserva cancelada com sucesso.')
        },
        onError: (err: unknown) => {
            const message = err instanceof ApiError ? err.message : 'Não foi possível cancelar a reserva.'
            toast.error(message)
        },
    })
}

export function useAdminBookingsQuery(params?: {
    status?: string
    space_id?: number
    search?: string
    page?: number
}) {
    return useQuery<Paginated<Booking>>({
        queryKey: ['admin-bookings', params],
        queryFn: async () => {
            const res = await bookingsApi.adminList(params)
            return (res as unknown) as Paginated<Booking>
        },
    })
}

export function useAdminMetricsQuery() {
    return useQuery<AdminMetrics>({
        queryKey: ['admin-metrics'],
        queryFn: async () => {
            const res = await bookingsApi.adminMetrics()
            return (res as unknown) as AdminMetrics
        },
        refetchInterval: 30000, // Atualiza a cada 30 segundos no dashboard
    })
}

export function useAdminUpdateBookingStatusMutation() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({
            bookingId,
            status,
            notes,
        }: {
            bookingId: number
            status: string
            notes?: string
        }) => {
            return await bookingsApi.adminUpdateStatus(bookingId, status, notes)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-bookings'] })
            queryClient.invalidateQueries({ queryKey: ['admin-metrics'] })
            queryClient.invalidateQueries({ queryKey: ['bookings'] })
            toast.success('Status da reserva atualizado com sucesso!')
        },
        onError: (err: unknown) => {
            const message =
                err instanceof ApiError ? err.message : 'Erro ao atualizar status da reserva.'
            toast.error(message)
        },
    })
}
