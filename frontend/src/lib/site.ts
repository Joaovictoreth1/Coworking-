// Configuração central do site: navbar e footer leem daqui.
export const APP_NAME = 'Meu App'

export interface NavLink {
    label: string
    href: string
    description?: string
}

export const NAV_LINKS: NavLink[] = [
    { label: 'Início', href: '#/' },
    { label: 'Sobre', href: '#/sobre' },
    { label: 'Contato', href: '#/contato' },
]

export const NAV_DROPDOWN: { label: string; items: NavLink[] } = {
    label: 'Recursos',
    items: [
        { label: 'Documentação', href: '#/docs', description: 'Guias e referência' },
        { label: 'Tutoriais', href: '#/tutoriais', description: 'Passo a passo para começar' },
        { label: 'Novidades', href: '#/novidades', description: 'O que mudou por aqui' },
    ],
}
