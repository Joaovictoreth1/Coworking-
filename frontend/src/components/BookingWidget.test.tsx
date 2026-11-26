import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../lib/api'
import { bookingsApi } from '../lib/bookings'
import type { Space } from '../lib/spaces'
import { BookingWidget } from './BookingWidget'

vi.mock('../auth/context', () => ({
    useAuth: () => ({
        user: { id: 1, name: 'João', email: 'joao@example.com', role: 'user', is_admin: false },
    }),
}))

vi.mock('../lib/route', () => ({
    navigate: vi.fn(),
}))

const mockSpace: Space = {
    id: 42,
    name: 'Sala Paulista',
    description: 'Sala equipada para reuniões',
    capacity: 8,
    zip_code: '01310-100',
    street: 'Av. Paulista',
    number: '1000',
    complement: null,
    neighborhood: 'Bela Vista',
    city: 'São Paulo',
    state: 'SP',
    hourly_price: 50,
    daily_price: 300,
    monthly_price: null,
    is_free: false,
    rating_avg: null,
    reviews_count: 0,
    is_favorite: false,
    owner_id: 99,
    opening_hours: [],
    availability: [],
    amenities: ['wifi'],
    is_active: true,
    photos: [],
    cover_url: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
}

function renderWidget(space: Space = mockSpace) {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
        },
    })

    return render(
        <QueryClientProvider client={queryClient}>
            <BookingWidget space={space} />
        </QueryClientProvider>,
    )
}

describe('BookingWidget', () => {
    beforeEach(() => {
        vi.restoreAllMocks()
    })

    it('renders daily opening window, occupied slots, and price preview', async () => {
        vi.spyOn(bookingsApi, 'availability').mockResolvedValue({
            date: '2026-12-01',
            timezone: 'America/Sao_Paulo',
            open: true,
            window: { from: '08:00', to: '18:00' },
            busy: [
                {
                    start_time: '2026-12-01T14:00:00-03:00',
                    end_time: '2026-12-01T16:00:00-03:00',
                },
            ],
        })

        vi.spyOn(bookingsApi, 'preview').mockResolvedValue({
            available: true,
            conflict: false,
            total_price: 200,
            duration_hours: 4,
            message: 'Horário disponível para reserva.',
        })

        renderWidget()

        await waitFor(() => {
            expect(screen.getByText(/08:00 às 18:00/)).toBeInTheDocument()
        })
        expect(screen.getByText('Horários já ocupados:')).toBeInTheDocument()
        expect(screen.getByText(/R\$\s*200,00/)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Confirmar Reserva' })).toBeEnabled()
    })

    it('blocks submission and shows inline error when end time is before start time', async () => {
        vi.spyOn(bookingsApi, 'availability').mockResolvedValue({
            date: '2026-12-01',
            timezone: 'America/Sao_Paulo',
            open: true,
            window: null,
            busy: [],
        })
        const previewSpy = vi.spyOn(bookingsApi, 'preview').mockResolvedValue({
            available: true,
            conflict: false,
            total_price: 200,
            duration_hours: 4,
            message: 'OK',
        })

        renderWidget()

        const startInput = screen.getByLabelText('Entrada')
        const endInput = screen.getByLabelText('Saída')
        fireEvent.change(startInput, { target: { value: '15:00' } })
        fireEvent.change(endInput, { target: { value: '12:00' } })

        expect(
            screen.getByText('O horário de saída deve ser posterior ao horário de entrada.'),
        ).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Horário Indisponível' })).toBeDisabled()
        expect(previewSpy).toHaveBeenCalledTimes(1)
    })

    it('shows 409 conflict feedback and disables submit when slot overlaps', async () => {
        vi.spyOn(bookingsApi, 'availability').mockResolvedValue({
            date: '2026-12-01',
            timezone: 'America/Sao_Paulo',
            open: true,
            window: null,
            busy: [],
        })
        vi.spyOn(bookingsApi, 'preview').mockRejectedValue(
            new ApiError('Este espaço já possui uma reserva no horário selecionado.', 409, {
                start_time: ['Este espaço já possui uma reserva no horário selecionado.'],
            }),
        )

        renderWidget()

        await waitFor(() => {
            expect(
                screen.getByText('Este espaço já possui uma reserva no horário selecionado.'),
            ).toBeInTheDocument()
        })
        expect(screen.getByText('Horário já reservado')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Horário Indisponível' })).toBeDisabled()
    })
})
