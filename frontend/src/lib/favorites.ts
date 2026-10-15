import { useCallback, useState } from 'react'
import { useAuth } from '../auth/context'
import { ApiError } from './api'
import { favoritesApi, type Space } from './spaces'
import { navigate } from './route'

/**
 * Alterna o favorito de um local com atualização otimista.
 * `apply` troca o estado na tela (deve ser estável: use useCallback); se a API falhar, desfaz.
 * Visitantes são levados ao login.
 */
export function useFavoriteToggle(apply: (id: number, favorite: boolean) => void) {
    const { user } = useAuth()
    const [error, setError] = useState('')

    const toggle = useCallback(
        async (space: Pick<Space, 'id' | 'is_favorite'>) => {
            if (!user) {
                navigate('login')
                return
            }

            const next = !space.is_favorite
            setError('')
            apply(space.id, next)

            try {
                await (next ? favoritesApi.add(space.id) : favoritesApi.remove(space.id))
            } catch (err) {
                apply(space.id, !next)
                setError(
                    err instanceof ApiError ? err.message : 'Não foi possível atualizar os favoritos.',
                )
            }
        },
        [user, apply],
    )

    return { toggle, error, clearError: () => setError('') }
}
