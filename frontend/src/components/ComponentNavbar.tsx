import { useState } from 'react'
import { useAuth } from '../auth/context'
import { href } from '../lib/route'
import { APP_NAME, NAV_DROPDOWN, NAV_LINKS } from '../lib/site'
import Container from './Container'
import Dropdown from './Dropdown'
import {
    ChevronDownIcon,
    CloseIcon,
    HeartIcon,
    LoginIcon,
    LogoutIcon,
    MapPinIcon,
    MenuIcon,
    SearchIcon,
    UserIcon,
    UserPlusIcon,
} from './icons'
import Logo from './Logo'

// --- Tipos e Interfaces ---
interface SearchBarProps {
    onSearch?: (query: string) => void
    className?: string
}

interface NavbarProps {
    onSearch?: (query: string) => void
}

interface MobileMenuProps {
    isOpen: boolean
    onClose: () => void
    onSearch?: (query: string) => void
}

// --- Estilos Base ---
const linkBase =
    'rounded px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900'
const menuItem =
    'flex w-full items-center gap-2.5 rounded px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100 hover:text-slate-900'

// --- Componentes Menores ---
function SearchBar({ onSearch, className = '' }: SearchBarProps) {
    const [query, setQuery] = useState('')

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        onSearch?.(query.trim())
    }

    return (
        <form
            role="search"
            onSubmit={handleSubmit}
            className={`relative ${className}`}
        >
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Pesquisar"
                aria-label="Pesquisar"
                className="h-9 w-full rounded border border-slate-200 bg-slate-100 pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white"
            />
        </form>
    )
}

function ResourcesDropdown() {
    return (
        <Dropdown
            triggerClassName={`${linkBase} flex items-center gap-1 py-2`}
            trigger={
                <>
                    {NAV_DROPDOWN.label}
                    <ChevronDownIcon className="h-4 w-4 text-slate-500" />
                </>
            }
        >
            {(close) =>
                NAV_DROPDOWN.items.map((item) => (
                    <a
                        key={item.href}
                        href={item.href}
                        onClick={close}
                        className="block rounded px-3 py-2 transition hover:bg-slate-100"
                    >
                        <span className="block text-sm font-medium text-slate-900">
                            {item.label}
                        </span>
                        {item.description && (
                            <span className="block text-xs text-slate-600">
                                {item.description}
                            </span>
                        )}
                    </a>
                ))
            }
        </Dropdown>
    )
}

function UserMenu() {
    const { user, logout } = useAuth()

    // Proteção caso user.name seja undefined/vazio de forma inesperada
    const initial = user?.name?.trim().charAt(0).toUpperCase()
    const firstName = user?.name?.split(' ')[0]

    return (
        <Dropdown
            align="right"
            label="Menu do usuário"
            triggerClassName="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 py-1 pl-1 pr-2.5 text-sm text-slate-800 transition hover:bg-slate-100"
            trigger={
                <>
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-indigo-500 text-xs font-semibold text-white">
                        {initial ? initial : <UserIcon className="h-4 w-4" />}
                    </span>
                    <span className="hidden max-w-28 truncate sm:inline">
                        {user ? firstName : 'Conta'}
                    </span>
                    <ChevronDownIcon className="h-4 w-4 text-slate-600" />
                </>
            }
        >
            {(close) =>
                user ? (
                    <>
                        <div className="px-3 py-2">
                            <p className="truncate text-sm font-medium text-slate-900">{user.name}</p>
                            <p className="truncate text-xs text-slate-600">{user.email}</p>
                        </div>
                        <hr className="my-1 border-slate-200" />
                        <a href={href('favorites')} onClick={close} className={menuItem}>
                            <HeartIcon className="h-4 w-4" />
                            Meus favoritos
                        </a>
                        <a href={href('spaces')} onClick={close} className={menuItem}>
                            <MapPinIcon className="h-4 w-4" />
                            {user.is_admin ? 'Gerenciar locais' : 'Meus locais'}
                        </a>
                        <button
                            type="button"
                            className={menuItem}
                            onClick={() => {
                                close()
                                logout()
                            }}
                        >
                            <LogoutIcon className="h-4 w-4" />
                            Sair
                        </button>
                    </>
                ) : (
                    <>
                        <a href={href('login')} onClick={close} className={menuItem}>
                            <LoginIcon className="h-4 w-4" />
                            Entrar
                        </a>
                        <a href={href('register')} onClick={close} className={menuItem}>
                            <UserPlusIcon className="h-4 w-4" />
                            Criar conta
                        </a>
                    </>
                )
            }
        </Dropdown>
    )
}

function MobileMenu({ isOpen, onClose, onSearch }: MobileMenuProps) {
    if (!isOpen) return null

    return (
        <div id="mobile-menu" className="border-t border-slate-200 pb-4 pt-3 lg:hidden">
            <SearchBar onSearch={onSearch} className="mb-3" />
            <nav className="flex flex-col">
                {NAV_LINKS.map((link) => (
                    <a
                        key={link.href}
                        href={link.href}
                        onClick={onClose}
                        className={`${linkBase} py-2.5`}
                    >
                        {link.label}
                    </a>
                ))}
                <details className="group">
                    <summary
                        className={`${linkBase} flex cursor-pointer list-none items-center justify-between py-2.5 [&::-webkit-details-marker]:hidden`}
                    >
                        {NAV_DROPDOWN.label}
                        <ChevronDownIcon className="h-4 w-4 text-slate-500 transition group-open:rotate-180" />
                    </summary>
                    <div className="ml-3 mt-1 flex flex-col border-l border-slate-200 pl-2">
                        {NAV_DROPDOWN.items.map((item) => (
                            <a
                                key={item.href}
                                href={item.href}
                                onClick={onClose}
                                className={`${linkBase} py-2.5`}
                            >
                                {item.label}
                            </a>
                        ))}
                    </div>
                </details>
            </nav>
        </div>
    )
}

// --- Componente Principal ---
export default function ComponentNavbar({ onSearch }: NavbarProps) {
    const [menuOpen, setMenuOpen] = useState(false)
    const closeMenu = () => setMenuOpen(false)

    return (
        <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
            <Container>
                <div className="flex h-16 items-center gap-3">
                    {/* Esquerda: logo + título */}
                    <a href={href('home')} className="mr-auto flex shrink-0 items-center gap-2.5 lg:mr-0">
                        <Logo />
                        <span className="font-display text-lg font-semibold tracking-tight text-slate-900">
                            {APP_NAME}
                        </span>
                    </a>

                    {/* Meio: links, dropdown e pesquisa (desktop) */}
                    <div className="hidden flex-1 items-center justify-center gap-1 lg:flex">
                        {NAV_LINKS.map((link) => (
                            <a key={link.href} href={link.href} className={`${linkBase} py-2`}>
                                {link.label}
                            </a>
                        ))}
                        <ResourcesDropdown />
                        <SearchBar onSearch={onSearch} className="ml-3 w-48 xl:w-64" />
                    </div>

                    {/* Direita: usuário + botão do menu mobile */}
                    <div className="flex items-center gap-2">
                        <UserMenu />
                        <button
                            type="button"
                            aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
                            aria-expanded={menuOpen}
                            aria-controls="mobile-menu"
                            onClick={() => setMenuOpen((o) => !o)}
                            className="grid h-9 w-9 place-items-center rounded border border-slate-200 text-slate-700 transition hover:bg-slate-100 lg:hidden"
                        >
                            {menuOpen ? <CloseIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
                        </button>
                    </div>
                </div>

                {/* Menu mobile */}
                <MobileMenu isOpen={menuOpen} onClose={closeMenu} onSearch={onSearch} />
            </Container>
        </header>
    )
}
