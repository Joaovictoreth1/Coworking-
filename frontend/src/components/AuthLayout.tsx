import type { ReactNode } from 'react'
import ComponentBody from './ComponentBody'
import { CheckIcon } from './icons'

interface AuthLayoutProps {
    title: string
    subtitle: string
    asideTitle: string
    asideText: string
    children: ReactNode
}

function DecorativeRings() {
    return (
        <svg
            className="absolute -right-24 -top-24 h-96 w-96 text-indigo-400/20"
            viewBox="0 0 400 400"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
        >
            <circle cx="200" cy="200" r="60" />
            <circle cx="200" cy="200" r="110" />
            <circle cx="200" cy="200" r="160" />
            <circle cx="200" cy="200" r="195" />
        </svg>
    )
}

export default function AuthLayout({
    title,
    subtitle,
    asideTitle,
    asideText,
    children,
}: AuthLayoutProps) {
    return (
        <ComponentBody>
            <div className="mx-auto grid w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl md:grid-cols-[1.05fr_1fr]">
                {/* Painel visual escuro alinhado ao novo hero */}
                <aside className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-10 text-white md:flex">
                    <DecorativeRings />
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl"
                    />

                    <div className="relative">
                        <span className="inline-flex rounded-full border border-indigo-400/30 bg-indigo-500/15 px-3 py-1 text-xs font-semibold text-indigo-200">
                            Coworking Brasil
                        </span>
                    </div>

                    <div className="relative">
                        <h2 className="font-display text-3xl font-bold leading-[1.15] tracking-tight text-white">
                            {asideTitle}
                        </h2>
                        <p className="mt-3 max-w-xs text-sm leading-relaxed text-slate-300">{asideText}</p>

                        <ul className="mt-6 space-y-2.5 text-xs text-slate-200">
                            <li className="flex items-center gap-2">
                                <CheckIcon className="h-4 w-4 text-emerald-400" />
                                Reserva instantânea por hora, diária ou mensal
                            </li>
                            <li className="flex items-center gap-2">
                                <CheckIcon className="h-4 w-4 text-emerald-400" />
                                Comprovante digital com código de check-in
                            </li>
                            <li className="flex items-center gap-2">
                                <CheckIcon className="h-4 w-4 text-emerald-400" />
                                Avaliações verificadas e lista de favoritos
                            </li>
                        </ul>
                    </div>
                </aside>

                {/* Formulário de Auth */}
                <section className="flex flex-col justify-center p-6 sm:p-10">
                    <header>
                        <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900">
                            {title}
                        </h1>
                        <p className="mb-8 mt-2 text-sm text-slate-600">{subtitle}</p>
                    </header>

                    <div>{children}</div>
                </section>
            </div>
        </ComponentBody>
    )
}
