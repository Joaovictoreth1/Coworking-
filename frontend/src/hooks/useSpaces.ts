import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { publicSpacesApi, spacesApi, type Paginated, type Space, type SpacePayload } from '../lib/spaces'

export function useSpaceDetailQuery(id: number) {
    return useQuery<Space>({
        queryKey: ['space-detail', id],
        queryFn: () => publicSpacesApi.get(id),
        retry: false,
    })
}

export function useAdminSpacesQuery(params: { page: number; q: string; status: string }) {
    return useQuery<Paginated<Space>>({
        queryKey: ['admin-spaces', params],
        queryFn: () => spacesApi.list(params),
        placeholderData: keepPreviousData,
    })
}

export function useCreateSpaceMutation() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (payload: SpacePayload) => spacesApi.create(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['spaces'] })
            queryClient.invalidateQueries({ queryKey: ['admin-spaces'] })
            queryClient.invalidateQueries({ queryKey: ['admin-metrics'] })
        },
    })
}

export function useUpdateSpaceMutation(id: number) {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (payload: SpacePayload) => spacesApi.update(id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['spaces'] })
            queryClient.invalidateQueries({ queryKey: ['admin-spaces'] })
            queryClient.invalidateQueries({ queryKey: ['space-detail', id] })
            queryClient.invalidateQueries({ queryKey: ['booking-preview', id] })
            queryClient.invalidateQueries({ queryKey: ['admin-metrics'] })
        },
    })
}

export function useDeleteSpaceMutation() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (id: number) => spacesApi.remove(id),
        onSuccess: (_data, id) => {
            queryClient.invalidateQueries({ queryKey: ['spaces'] })
            queryClient.invalidateQueries({ queryKey: ['admin-spaces'] })
            queryClient.removeQueries({ queryKey: ['space-detail', id] })
            queryClient.invalidateQueries({ queryKey: ['booking-preview', id] })
            queryClient.invalidateQueries({ queryKey: ['bookings'] })
            queryClient.invalidateQueries({ queryKey: ['admin-bookings'] })
            queryClient.invalidateQueries({ queryKey: ['admin-metrics'] })
        },
    })
}
