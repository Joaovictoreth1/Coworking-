// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, expect, test, vi } from 'vitest'
import AdminDashboard from './AdminDashboard'

vi.mock('../../components/ComponentBody', () => ({
    default: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}))

afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
})

test('shows booking times and dates in the scheduling timezone on the admin list', async () => {
    const booking = {
        id: 11, space_name: 'Estúdio', status: 'confirmed', timezone: 'America/Sao_Paulo',
        start_time: '2029-06-10T12:00:00+00:00', end_time: '2029-06-10T16:00:00+00:00',
        duration_hours: 4, total_price: 200,
    }
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) =>
        Promise.resolve(Response.json(url.endsWith('/admin/metrics') ? { total_bookings: 2 } : {
            data: [booking, {
                ...booking, id: 12, duration_hours: 1,
                start_time: '2029-06-10T02:00:00+00:00', end_time: '2029-06-10T03:00:00+00:00',
            }],
        }))))
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={client}><AdminDashboard /></QueryClientProvider>)

    const row = await screen.findByRole('row', { name: /#11/ })
    expect(row).toHaveTextContent('09:00 às 13:00 (4h)')
    const previousDay = screen.getByRole('row', { name: /#12/ })
    expect(within(previousDay).getByText('09/06/2029')).toBeVisible()
    expect(previousDay).toHaveTextContent('23:00 às 00:00 (1h)')
})

test('distinguishes failed admin queries from empty results', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() =>
        Promise.resolve(Response.json({ message: 'Indisponível' }, { status: 503 }))))
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={client}><AdminDashboard /></QueryClientProvider>)

    expect(await screen.findByText('Não foi possível carregar as métricas.')).toBeVisible()
    expect(await screen.findByText('Não foi possível carregar as reservas.')).toBeVisible()
    expect(screen.queryByText(/Nenhuma reserva encontrada/)).not.toBeInTheDocument()
    expect(screen.queryByText('Distribuição Geral de Reservas')).not.toBeInTheDocument()
})
