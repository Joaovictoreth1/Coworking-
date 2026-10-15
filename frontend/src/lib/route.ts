import { useSyncExternalStore } from 'react'

export type Route =
    | 'home'
    | 'login'
    | 'register'
    | 'spaces'
    | 'space-new'
    | 'space-edit'
    | 'space-detail'
    | 'favorites'

type StaticRoute = Exclude<Route, 'space-edit' | 'space-detail'>

const PATHS: Record<StaticRoute, string> = {
    home: '#/',
    login: '#/login',
    register: '#/cadastro',
    spaces: '#/admin/locais',
    'space-new': '#/admin/locais/novo',
    favorites: '#/favoritos',
}

const EDIT_PATH = /^#\/admin\/locais\/(\d+)\/editar$/
const DETAIL_PATH = /^#\/locais\/(\d+)$/

function parseId(hash: string): number | null {
    const match = EDIT_PATH.exec(hash) ?? DETAIL_PATH.exec(hash)
    return match ? Number(match[1]) : null
}

function parse(hash: string): Route {
    if (hash === PATHS.login) return 'login'
    if (hash === PATHS.register) return 'register'
    if (hash === PATHS.spaces) return 'spaces'
    if (hash === PATHS['space-new']) return 'space-new'
    if (hash === PATHS.favorites) return 'favorites'
    if (EDIT_PATH.test(hash)) return 'space-edit'
    if (DETAIL_PATH.test(hash)) return 'space-detail'
    return 'home'
}

function subscribe(callback: () => void) {
    window.addEventListener('hashchange', callback)
    return () => window.removeEventListener('hashchange', callback)
}

export function useRoute(): Route {
    return useSyncExternalStore(subscribe, () => parse(window.location.hash))
}

/** Id das rotas com parâmetro (#/locais/12 e #/admin/locais/12/editar), ou null nas outras. */
export function useRouteId(): number | null {
    return useSyncExternalStore(subscribe, () => parseId(window.location.hash))
}

export function href(route: Route, id?: number): string {
    if (route === 'space-edit') return `#/admin/locais/${id}/editar`
    if (route === 'space-detail') return `#/locais/${id}`
    return PATHS[route]
}

export function navigate(route: Route, id?: number) {
    window.location.hash = href(route, id)
}
