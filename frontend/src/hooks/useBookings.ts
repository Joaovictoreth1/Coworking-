import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError, getErrorMessage } from '../lib/api'
import {
    bookingsApi,
    type BookingAvailabilityResult,
    type BookingPayload,
    type BookingPreviewResult,
} from '../lib/bookings'
import type { AdminMetrics, Booking, Paginated } from '../lib/spaces'
import { toast } from '../store/useToastStore'

export function useUserBookingsQuery(status?: string) {
    return useQuery<Booking[]>({
        queryKey: ['bookings', status ?? 'all'],
        queryFn: async () => {
            const res = await bookingsApi.list(status)
            return res.data
        },
    })
}

export function useBookingAvailabilityQuery(spaceId: number, date: string, enabled = true) {
    return useQuery<BookingAvailabilityResult>({
        queryKey: ['booking-availability', spaceId, date],
        queryFn: async () => {
            return await bookingsApi.availability(spaceId, date)
        },
        enabled: enabled && Boolean(spaceId && date),
        staleTime: 30_000,
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
            queryClient.invalidateQueries({ queryKey: ['booking-preview'] })
            queryClient.invalidateQueries({ queryKey: ['booking-availability', spaceId] })
            queryClient.invalidateQueries({ queryKey: ['admin-bookings'] })
            queryClient.invalidateQueries({ queryKey: ['admin-metrics'] })
            toast.success('Reserva confirmada com sucesso!')
        },
        onError: (err: unknown) => {
            if (err instanceof ApiError && err.status === 409) {
                queryClient.invalidateQueries({ queryKey: ['booking-preview', spaceId] })
                queryClient.invalidateQueries({ queryKey: ['booking-availability', spaceId] })
            }
            toast.error(getErrorMessage(err, 'Falha ao confirmar reserva.'))
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
            queryClient.invalidateQueries({ queryKey: ['booking-preview'] })
            queryClient.invalidateQueries({ queryKey: ['booking-availability'] })
            queryClient.invalidateQueries({ queryKey: ['admin-bookings'] })
            queryClient.invalidateQueries({ queryKey: ['admin-metrics'] })
            toast.success('Reserva cancelada com sucesso.')
        },
        onError: (err: unknown) => {
            toast.error(getErrorMessage(err, 'Não foi possível cancelar a reserva.'))
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
            return res
        },
    })
}

export function useAdminMetricsQuery() {
    return useQuery<AdminMetrics>({
        queryKey: ['admin-metrics'],
        queryFn: async () => {
            const res = await bookingsApi.adminMetrics()
            return res
        },
        refetchInterval: 30000,
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
            queryClient.invalidateQueries({ queryKey: ['booking-preview'] })
            queryClient.invalidateQueries({ queryKey: ['booking-availability'] })
            toast.success('Status da reserva atualizado com sucesso!')
        },
        onError: (err: unknown) => {
            toast.error(getErrorMessage(err, 'Erro ao atualizar status da reserva.'))
        },
    })
}
