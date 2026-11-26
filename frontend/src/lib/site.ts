// Configuração central do site: navbar e footer leem daqui.
export const APP_NAME = 'Coworking Brasil'

export interface NavLink {
    label: string
    href: string
    description?: string
}

export const NAV_LINKS: NavLink[] = [
    { label: 'Explorar espaços', href: '#/' },
    { label: 'Minhas reservas', href: '#/minhas-reservas' },
    { label: 'Meus favoritos', href: '#/favoritos' },
]

export const NAV_DROPDOWN: { label: string; items: NavLink[] } = {
    label: 'Conta',
    items: [
        { label: 'Entrar', href: '#/login', description: 'Acesse suas reservas e favoritos' },
        { label: 'Criar conta', href: '#/cadastro', description: 'Cadastre-se gratuitamente em segundos' },
        { label: 'Gerenciar locais', href: '#/admin/locais', description: 'Cadastre ou edite seus espaços' },
    ],
}
