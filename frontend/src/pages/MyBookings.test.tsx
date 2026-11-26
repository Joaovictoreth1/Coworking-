// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, expect, test, vi } from 'vitest'
import MyBookings from './MyBookings'

vi.mock('../components/ComponentBody', () => ({
    default: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}))

afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
})

test('shows the local schedule on the booking card and voucher for timestamps returned in UTC', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => Promise.resolve(Response.json({
        data: [{
            id: 8, space_id: 42, space_name: 'Estúdio', user_id: 1, status: 'confirmed',
            start_time: '2029-06-10T12:00:00+00:00', end_time: '2029-06-10T16:00:00+00:00',
            timezone: 'America/Sao_Paulo', duration_hours: 4, total_price: 200, can_cancel: false,
        }],
    }))))
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={client}><MyBookings /></QueryClientProvider>)

    expect(await screen.findByText(/^09:00 às 13:00/)).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: /Comprovante/ }))
    expect(screen.getByText('Horário / Período:').parentElement).toHaveTextContent('09:00 às 13:00 (4h)')
})
