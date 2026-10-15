import { useState } from 'react'
import { useAuth } from '../auth/context'
import { href } from '../lib/route'
import { APP_NAME, NAV_DROPDOWN, NAV_LINKS } from '../lib/site'
import Container from './Container'
import Dropdown from './Dropdown'
import {
    ChevronDownIcon,
    CloseIcon,
    LoginIcon,
    LogoutIcon,
    MapPinIcon,
    MenuIcon,
    SearchIcon,
    UserIcon,
    UserPlusIcon,
} from './icons'
import Logo from './Logo'

const linkBase =
    'rounded-lg px-3 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white'
const menuItem =
    'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-slate-300 transition hover:bg-white/5 hover:text-white'

function SearchBar({
    onSearch,
    className = '',
}: {
    onSearch?: (query: string) => void
    className?: string
}) {
    const [query, setQuery] = useState('')

    return (
        <form
            role="search"
            onSubmit={(e) => {
                e.preventDefault()
                onSearch?.(query.trim())
            }}
            className={`relative ${className}`}
        >
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Pesquisar"
                aria-label="Pesquisar"
                className="h-9 w-full rounded-lg border border-white/10 bg-white/5 pr-3 pl-9 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-indigo-400 focus:bg-white/10"
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
                        className="block rounded-lg px-3 py-2 transition hover:bg-white/5"
                    >
                        <span className="block text-sm font-medium text-white">{item.label}</span>
                        {item.description && (
                            <span className="block text-xs text-slate-400">{item.description}</span>
                        )}
                    </a>
                ))
            }
        </Dropdown>
    )
}

function UserMenu() {
    const { user, logout } = useAuth()

    return (
        <Dropdown
            align="right"
            label="Menu do usuário"
            triggerClassName="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1 pr-2.5 pl-1 text-sm text-slate-200 transition hover:bg-white/10"
            trigger={
                <>
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-indigo-500 text-xs font-semibold text-white">
                        {user ? user.name.trim().charAt(0).toUpperCase() : <UserIcon className="h-4 w-4" />}
                    </span>
                    <span className="hidden max-w-28 truncate sm:inline">
                        {user ? user.name.split(' ')[0] : 'Conta'}
                    </span>
                    <ChevronDownIcon className="h-4 w-4 text-slate-400" />
                </>
            }
        >
            {(close) =>
                user ? (
                    <>
                        <div className="px-3 py-2">
                            <p className="truncate text-sm font-medium text-white">{user.name}</p>
                            <p className="truncate text-xs text-slate-400">{user.email}</p>
                        </div>
                        <hr className="my-1 border-white/10" />
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

export default function ComponentNavbar({ onSearch }: { onSearch?: (query: string) => void }) {
    const [menuOpen, setMenuOpen] = useState(false)
    const closeMenu = () => setMenuOpen(false)

    return (
        <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/80 backdrop-blur">
            <Container>
                <div className="flex h-16 items-center gap-3">
                    {/* Esquerda: logo + título */}
                    <a href={href('home')} className="mr-auto flex shrink-0 items-center gap-2.5 lg:mr-0">
                        <Logo />
                        <span className="font-display text-lg font-semibold tracking-tight text-white">
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
                            className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-slate-300 transition hover:bg-white/5 lg:hidden"
                        >
                            {menuOpen ? <CloseIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
                        </button>
                    </div>
                </div>

                {/* Menu mobile */}
                {menuOpen && (
                    <div id="mobile-menu" className="border-t border-white/10 pt-3 pb-4 lg:hidden">
                        <SearchBar onSearch={onSearch} className="mb-3" />
                        <nav className="flex flex-col">
                            {NAV_LINKS.map((link) => (
                                <a
                                    key={link.href}
                                    href={link.href}
                                    onClick={closeMenu}
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
                                <div className="mt-1 ml-3 flex flex-col border-l border-white/10 pl-2">
                                    {NAV_DROPDOWN.items.map((item) => (
                                        <a
                                            key={item.href}
                                            href={item.href}
                                            onClick={closeMenu}
                                            className={`${linkBase} py-2.5`}
                                        >
                                            {item.label}
                                        </a>
                                    ))}
                                </div>
                            </details>
                        </nav>
                    </div>
                )}
            </Container>
        </header>
    )
}
