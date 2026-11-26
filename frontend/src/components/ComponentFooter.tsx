import { href } from '../lib/route'
import { APP_NAME, NAV_DROPDOWN, NAV_LINKS, type NavLink } from '../lib/site'
import Container from './Container'
import Logo from './Logo'

function FooterColumn({ title, links }: { title: string; links: NavLink[] }) {
    return (
        <nav aria-label={title}>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-900">{title}</h2>
            <ul className="mt-3 space-y-2.5">
                {links.map((link) => (
                    <li key={link.href}>
                        <a
                            href={link.href}
                            className="text-sm text-slate-600 transition hover:text-indigo-600"
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
        <footer className="mt-12 border-t border-slate-200/80 bg-white">
            <Container className="py-12">
                <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr]">
                    <div className="sm:col-span-2 lg:col-span-1">
                        <a href={href('home')} className="inline-flex items-center gap-2.5">
                            <Logo className="h-8 w-8" />
                            <span className="font-display text-lg font-bold tracking-tight text-slate-900">
                                {APP_NAME}
                            </span>
                        </a>
                        <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-600">
                            Encontre e reserve coworkings, salas de reunião e estações de trabalho em
                            todo o Brasil — com confirmação imediata e voucher digital.
                        </p>
                    </div>
                    <FooterColumn title="Navegação" links={NAV_LINKS} />
                    <FooterColumn title={NAV_DROPDOWN.label} links={NAV_DROPDOWN.items} />
                </div>
                <div className="mt-10 flex flex-col items-start justify-between gap-2 border-t border-slate-100 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center">
                    <p>© {new Date().getFullYear()} {APP_NAME}. Todos os direitos reservados.</p>
                    <p>Coworkings, salas privativas e espaços gratuitos em um só lugar.</p>
                </div>
            </Container>
        </footer>
    )
}
