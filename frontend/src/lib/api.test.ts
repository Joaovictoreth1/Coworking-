import { describe, expect, it, vi } from 'vitest'
import { ApiError, getErrorMessage, request } from './api'

describe('getErrorMessage', () => {
    it('prioritizes the first field validation error over generic message', () => {
        const err = new ApiError('Dados inválidos.', 422, {
            start_time: ['O horário de início não pode ser no passado.'],
            end_time: ['Outro erro.'],
        })

        expect(getErrorMessage(err, 'Fallback')).toBe('O horário de início não pode ser no passado.')
    })

    it('falls back to ApiError message when errors map is empty', () => {
        const err = new ApiError('Conflito de horário.', 409)
        expect(getErrorMessage(err, 'Fallback')).toBe('Conflito de horário.')
    })

    it('uses fallback for unknown error values', () => {
        expect(getErrorMessage(new Error('raw'), 'Fallback')).toBe('Fallback')
        expect(getErrorMessage(null, 'Fallback')).toBe('Fallback')
    })
})

describe('request', () => {
    it('throws ApiError with status 0 on network failure', async () => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

        await expect(request('/spaces')).rejects.toMatchObject({
            status: 0,
            message: 'Não foi possível conectar ao servidor.',
        })

        vi.unstubAllGlobals()
    })

    it('throws ApiError with HTTP status and field errors on non-OK response', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue(
                new Response(
                    JSON.stringify({
                        message: 'Conflito',
                        errors: { start_time: ['Horário indisponível.'] },
                    }),
                    { status: 409, headers: { 'Content-Type': 'application/json' } },
                ),
            ),
        )

        await expect(request('/spaces/1/bookings', { method: 'POST', body: {} })).rejects.toEqual(
            expect.objectContaining({
                status: 409,
                message: 'Conflito',
                errors: { start_time: ['Horário indisponível.'] },
            }),
        )

        vi.unstubAllGlobals()
    })
})
