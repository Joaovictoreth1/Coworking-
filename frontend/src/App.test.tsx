// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, expect, test, vi } from 'vitest'
import App from './App'
import { tokenStorage, type User } from './lib/api'

let user: User
vi.mock('./auth/context', () => ({ useAuth: () => ({ user, loading: false }) }))
vi.mock('./components/ComponentBody', () => ({
    default: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}))

afterEach(() => {
    cleanup()
    tokenStorage.clear()
    history.replaceState(null, '', '/')
    vi.unstubAllGlobals()
})

test('does not reuse the previous account’s cached personal bookings', async () => {
    const firstUser: User = { id: 1, name: 'Ana', email: 'ana@example.com', is_admin: false, role: 'user' }
    user = firstUser
    history.replaceState(null, '', '/#/minhas-reservas')
    tokenStorage.set('first')
    vi.stubGlobal('fetch', vi.fn().mockImplementation((_, options: RequestInit) => {
        const first = new Headers(options.headers).get('Authorization') === 'Bearer first'
        return Promise.resolve(Response.json({ data: [{
            id: first ? 11 : 22, space_id: 42, space_name: first ? 'Reserva da Ana' : 'Reserva da Bia',
            start_time: '2029-06-10T12:00:00+00:00', end_time: '2029-06-10T16:00:00+00:00',
            timezone: 'America/Sao_Paulo', duration_hours: 4, total_price: 200,
        }] }))
    }))

    const { rerender } = render(<App />)
    expect(await screen.findByText('Reserva da Ana')).toBeVisible()

    tokenStorage.set('second')
    user = { ...firstUser, id: 2, name: 'Bia', email: 'bia@example.com' }
    rerender(<App />)

    expect(screen.queryByText('Reserva da Ana')).not.toBeInTheDocument()
    expect(await screen.findByText('Reserva da Bia')).toBeVisible()
})
