import { create } from 'zustand'
import { EMPTY_FILTERS, type FilterState } from '../lib/spaces'

export type BookingStatusTab = '' | 'confirmed' | 'pending' | 'completed' | 'cancelled'

interface UiState {
    // Catálogo público (Home)
    catalogSearch: string
    catalogFilters: FilterState
    catalogPage: number
    setCatalogSearch: (search: string) => void
    setCatalogFilters: (next: FilterState | ((prev: FilterState) => FilterState)) => void
    setCatalogPage: (page: number) => void
    clearCatalogFilters: () => void

    // Minhas Reservas (cliente)
    bookingsTab: BookingStatusTab
    setBookingsTab: (tab: BookingStatusTab) => void

    // Dashboard Administrativo (reservas)
    adminBookingStatus: string
    adminBookingSearch: string
    setAdminBookingStatus: (status: string) => void
    setAdminBookingSearch: (search: string) => void
    resetAdminBookingFilters: () => void

    // Gestão Administrativa de Locais
    adminSpaceSearch: string
    adminSpaceStatus: string
    adminSpacePage: number
    setAdminSpaceSearch: (search: string) => void
    setAdminSpaceStatus: (status: string) => void
    setAdminSpacePage: (page: number) => void
}

export const useUiStore = create<UiState>((set) => ({
    catalogSearch: '',
    catalogFilters: EMPTY_FILTERS,
    catalogPage: 1,
    setCatalogSearch: (catalogSearch) => set({ catalogSearch }),
    setCatalogFilters: (next) =>
        set((state) => ({
            catalogFilters: typeof next === 'function' ? next(state.catalogFilters) : next,
        })),
    setCatalogPage: (catalogPage) => set({ catalogPage }),
    clearCatalogFilters: () =>
        set((state) => ({
            catalogFilters: { ...EMPTY_FILTERS, sort: state.catalogFilters.sort },
            catalogPage: 1,
        })),

    bookingsTab: '',
    setBookingsTab: (bookingsTab) => set({ bookingsTab }),

    adminBookingStatus: '',
    adminBookingSearch: '',
    setAdminBookingStatus: (adminBookingStatus) => set({ adminBookingStatus }),
    setAdminBookingSearch: (adminBookingSearch) => set({ adminBookingSearch }),
    resetAdminBookingFilters: () => set({ adminBookingStatus: '', adminBookingSearch: '' }),

    adminSpaceSearch: '',
    adminSpaceStatus: '',
    adminSpacePage: 1,
    setAdminSpaceSearch: (adminSpaceSearch) => set({ adminSpaceSearch }),
    setAdminSpaceStatus: (adminSpaceStatus) => set({ adminSpaceStatus, adminSpacePage: 1 }),
    setAdminSpacePage: (adminSpacePage) => set({ adminSpacePage }),
}))
