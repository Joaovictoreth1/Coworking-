import { href } from '../lib/route'
import { APP_NAME, NAV_DROPDOWN, NAV_LINKS, type NavLink } from '../lib/site'
import Container from './Container'
import Logo from './Logo'

function FooterColumn({ title, links }: { title: string; links: NavLink[] }) {
    return (
        <nav aria-label={title}>
            <h2 className="text-sm font-semibold text-white">{title}</h2>
            <ul className="mt-3 space-y-2">
                {links.map((link) => (
                    <li key={link.href}>
                        <a
                            href={link.href}
                            className="text-sm text-slate-400 transition hover:text-white"
                        >
                            {link.label}
                        </a>
                    </li>
                ))}
            </ul>
        </nav>
    )
}

export default function ComponentFooter() {
    return (
        <footer className="border-t border-white/10 bg-slate-950">
            <Container className="py-10">
                <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr]">
                    <div className="sm:col-span-2 lg:col-span-1">
                        <a href={href('home')} className="inline-flex items-center gap-2.5">
                            <Logo className="h-8 w-8" />
                            <span className="font-display text-lg font-semibold tracking-tight text-white">
                                {APP_NAME}
                            </span>
                        </a>
                        <p className="mt-3 max-w-xs text-sm text-slate-400">
                            Um ponto de partida limpo para o seu projeto.
                        </p>
                    </div>
                    <FooterColumn title="Navegação" links={NAV_LINKS} />
                    <FooterColumn title={NAV_DROPDOWN.label} links={NAV_DROPDOWN.items} />
                </div>
                <p className="mt-10 border-t border-white/10 pt-6 text-sm text-slate-500">
                    © {new Date().getFullYear()} {APP_NAME}. Todos os direitos reservados.
                </p>
            </Container>
        </footer>
    )
}
