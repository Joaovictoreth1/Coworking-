import { useCallback, useEffect, useMemo, useState } from 'react'
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth/context'
import { ApiError } from '../lib/api'
import { useFavoriteToggle } from '../lib/favorites'
import {
    EMPTY_FILTERS,
    hasPriceFilter,
    publicSpacesApi,
    type FilterState,
    type Paginated,
    type Space,
} from '../lib/spaces'

const DEBOUNCE_MS = 350

/**
 * Toda a lógica de negócio da vitrine pública: busca com debounce, filtros,
 * paginação, cache (React Query) e favorito otimista. A Home só apresenta.
 */
export function useSpaceSearch() {
    const { user } = useAuth()
    const queryClient = useQueryClient()

    const [search, setSearch] = useState('')
    const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS)
    // O que de fato foi enviado à API (texto e preços esperam o usuário parar de digitar).
    const [applied, setApplied] = useState({ q: '', ...EMPTY_FILTERS })
    const [page, setPage] = useState(1)

    useEffect(() => {
        const next = { q: search.trim(), ...filters }
        const same = (Object.keys(next) as (keyof typeof next)[]).every((k) => next[k] === applied[k])
        if (same) return

        // Digitação (q / preços) aguarda o debounce; toggles (tipo / ordenação) aplicam na hora.
        const typing =
            next.q !== applied.q ||
            next.minPrice !== applied.minPrice ||
            next.maxPrice !== applied.maxPrice

        const timer = setTimeout(
            () => {
                setApplied(next)
                setPage(1)
            },
            typing ? DEBOUNCE_MS : 0,
        )
        return () => clearTimeout(timer)
    }, [search, filters, applied])

    const queryKey = useMemo(
        () => ['spaces', { ...applied, page, userId: user?.id ?? null }] as const,
        [applied, page, user?.id],
    )

    const query = useQuery({
        queryKey,
        queryFn: () =>
            publicSpacesApi.list({
                page,
                q: applied.q,
                priceType: applied.priceType,
                minPrice: applied.minPrice,
                maxPrice: applied.maxPrice,
                sort: applied.sort,
            }),
        // Mantém os cards anteriores visíveis (com leve opacidade) enquanto a próxima página carrega.
        placeholderData: keepPreviousData,
    })

    // Favorito otimista: reflete direto no cache da página atual; se a API falhar, o hook desfaz.
    const applyFavorite = useCallback(
        (id: number, favorite: boolean) => {
            queryClient.setQueryData<Paginated<Space>>(queryKey, (prev) =>
                prev
                    ? {
                          ...prev,
                          data: prev.data.map((s) =>
                              s.id === id ? { ...s, is_favorite: favorite } : s,
                          ),
                      }
                    : prev,
            )
        },
        [queryClient, queryKey],
    )
    const favorites = useFavoriteToggle(applyFavorite)

    const clearFilters = useCallback(() => setFilters((f) => ({ ...EMPTY_FILTERS, sort: f.sort })), [])

    const goToPage = useCallback((next: number) => {
        setPage(next)
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }, [])

    const errorMessage = query.isError
        ? query.error instanceof ApiError
            ? query.error.message
            : 'Não foi possível carregar os locais.'
        : null

    return {
        // estado de entrada (controlado pela UI)
        search,
        setSearch,
        filters,
        setFilters,
        clearFilters,
        // paginação
        page,
        goToPage,
        // resultado
        items: query.data?.data ?? [],
        meta: query.data?.meta ?? null,
        isLoading: query.isLoading,
        isFetching: query.isFetching,
        errorMessage,
        // derivados
        applied,
        filtersOn: hasPriceFilter(applied) || applied.q !== '',
        hasActivePriceFilter: hasPriceFilter(applied),
        // favoritos
        favorites,
    }
}
