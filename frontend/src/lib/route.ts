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
    | 'my-bookings'
    | 'admin-dashboard'

type StaticRoute = Exclude<Route, 'space-edit' | 'space-detail'>

const PATHS: Record<StaticRoute, string> = {
    home: '#/',
    login: '#/login',
    register: '#/cadastro',
    spaces: '#/admin/locais',
    'space-new': '#/admin/locais/novo',
    favorites: '#/favoritos',
    'my-bookings': '#/minhas-reservas',
    'admin-dashboard': '#/admin/dashboard',
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
    if (hash === PATHS['my-bookings']) return 'my-bookings'
    if (hash === PATHS['admin-dashboard']) return 'admin-dashboard'
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

export function href(
    route: Route | 'space' | 'admin_spaces' | 'admin_space_new',
    param?: number | { id: number },
): string {
    const id = typeof param === 'number' ? param : param?.id

    if (route === 'space-edit') return `#/admin/locais/${id}/editar`
    if (route === 'space-detail' || route === 'space') return `#/locais/${id}`
    if (route === 'admin_spaces') return PATHS.spaces
    if (route === 'admin_space_new') return PATHS['space-new']
    return PATHS[route as StaticRoute] ?? '#/'
}

export function navigate(route: Route | 'space', id?: number) {
    window.location.hash = href(route, id)
}
