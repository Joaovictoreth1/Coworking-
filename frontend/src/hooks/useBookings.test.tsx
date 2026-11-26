// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, expect, test, vi } from 'vitest'
import { useAdminUpdateBookingStatusMutation, useCancelBookingMutation } from './useBookings'

afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
})

test.each([
    ['cancellation', useCancelBookingMutation],
    ['status change', useAdminUpdateBookingStatusMutation],
] as const)('refreshes the affected space schedule after %s', async (_, useMutation) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({
        message: 'Atualizada', booking: { id: 8, space_id: 42 },
    })))
    const client = new QueryClient()
    const preview = ['booking-preview', 42, '2029-06-10T09:00:00', '2029-06-10T13:00:00']
    const availability = ['availability', 42, '2029-06-10']
    const otherPreview = ['booking-preview', 12, '2029-06-10T09:00:00', '2029-06-10T13:00:00']
    client.setQueryData(preview, { available: false })
    client.setQueryData(availability, { busy: [] })
    client.setQueryData(otherPreview, { available: false })
    const { result } = renderHook<{
        mutateAsync: (payload: { bookingId: number; status: string }) => Promise<unknown>
    }, unknown>(useMutation, {
        wrapper: ({ children }: { children: ReactNode }) =>
            <QueryClientProvider client={client}>{children}</QueryClientProvider>,
    })

    await act(async () => {
        await result.current.mutateAsync({ bookingId: 8, status: 'cancelled' })
    })

    expect(client.getQueryState(preview)?.isInvalidated).toBe(true)
    expect(client.getQueryState(availability)?.isInvalidated).toBe(true)
    expect(client.getQueryState(otherPreview)?.isInvalidated).toBe(false)
})
