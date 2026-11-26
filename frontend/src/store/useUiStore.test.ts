import { beforeEach, describe, expect, it } from 'vitest'
import { EMPTY_FILTERS } from '../lib/spaces'
import { useUiStore } from './useUiStore'

describe('useUiStore', () => {
    beforeEach(() => {
        useUiStore.setState({
            catalogSearch: '',
            catalogFilters: EMPTY_FILTERS,
            catalogPage: 1,
            bookingsTab: '',
            adminBookingStatus: '',
            adminBookingSearch: '',
            adminSpaceSearch: '',
            adminSpaceStatus: '',
            adminSpacePage: 1,
        })
    })

    it('clears catalog filters while preserving selected sort order', () => {
        const store = useUiStore.getState()
        store.setCatalogSearch('paulista')
        store.setCatalogFilters((prev) => ({
            ...prev,
            priceType: 'hourly',
            minPrice: '50',
            sort: 'price_asc',
        }))
        store.setCatalogPage(3)

        useUiStore.getState().clearCatalogFilters()

        const next = useUiStore.getState()
        expect(next.catalogSearch).toBe('')
        expect(next.catalogPage).toBe(1)
        expect(next.catalogFilters.priceType).toBe('')
        expect(next.catalogFilters.minPrice).toBe('')
        expect(next.catalogFilters.sort).toBe('price_asc')
    })

    it('resets adminSpacePage to 1 when changing adminSpaceStatus', () => {
        useUiStore.getState().setAdminSpacePage(4)
        useUiStore.getState().setAdminSpaceStatus('inactive')

        const state = useUiStore.getState()
        expect(state.adminSpaceStatus).toBe('inactive')
        expect(state.adminSpacePage).toBe(1)
    })

    it('resets admin booking filters cleanly', () => {
        useUiStore.getState().setAdminBookingStatus('confirmed')
        useUiStore.getState().setAdminBookingSearch('joao')
        useUiStore.getState().resetAdminBookingFilters()

        const state = useUiStore.getState()
        expect(state.adminBookingStatus).toBe('')
        expect(state.adminBookingSearch).toBe('')
    })
})
