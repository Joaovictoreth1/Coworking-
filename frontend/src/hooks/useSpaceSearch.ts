import { useCallback, useEffect, useMemo, useState } from 'react'
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth/context'
import { getErrorMessage } from '../lib/api'
import { useFavoriteToggle } from '../lib/favorites'
import {
    EMPTY_FILTERS,
    hasPriceFilter,
    publicSpacesApi,
    type Paginated,
    type Space,
} from '../lib/spaces'
import { useUiStore } from '../store/useUiStore'

const DEBOUNCE_MS = 350

/**
 * Lógica da vitrine pública: estado de filtros/busca no Zustand (UI client-side)
 * e cache/busca no React Query (estado de servidor).
 */
export function useSpaceSearch() {
    const { user } = useAuth()
    const queryClient = useQueryClient()

    const search = useUiStore((s) => s.catalogSearch)
    const setSearch = useUiStore((s) => s.setCatalogSearch)
    const filters = useUiStore((s) => s.catalogFilters)
    const setFilters = useUiStore((s) => s.setCatalogFilters)
    const page = useUiStore((s) => s.catalogPage)
    const setPage = useUiStore((s) => s.setCatalogPage)
    const clearFilters = useUiStore((s) => s.clearCatalogFilters)

    // Snapshot enviado à API (texto e preços aguardam debounce).
    const [applied, setApplied] = useState(() => ({ q: search.trim(), ...filters }))

    useEffect(() => {
        const next = { q: search.trim(), ...filters }
        const same = (Object.keys(next) as (keyof typeof next)[]).every((k) => next[k] === applied[k])
        if (same) return

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
    }, [search, filters, applied, setPage])

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
        placeholderData: keepPreviousData,
    })

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
            queryClient.invalidateQueries({ queryKey: ['space-detail', id] })
        },
        [queryClient, queryKey],
    )
    const favorites = useFavoriteToggle(applyFavorite)

    const clearAll = useCallback(() => {
        setSearch('')
        setFilters(EMPTY_FILTERS)
        setPage(1)
    }, [setSearch, setFilters, setPage])

    const goToPage = useCallback(
        (next: number) => {
            setPage(next)
            window.scrollTo({ top: 0, behavior: 'smooth' })
        },
        [setPage],
    )

    const errorMessage = query.isError
        ? getErrorMessage(query.error, 'Não foi possível carregar os locais.')
        : null

    return {
        search,
        setSearch,
        filters,
        setFilters,
        clearFilters,
        clearAll,
        refetch: query.refetch,
        // paginação
        page,
        goToPage,
        items: query.data?.data ?? [],
        meta: query.data?.meta ?? null,
        isLoading: query.isLoading,
        isFetching: query.isFetching,
        errorMessage,
        applied,
        filtersOn: hasPriceFilter(applied) || applied.q !== '',
        hasActivePriceFilter: hasPriceFilter(applied),
        favorites,
    }
}
