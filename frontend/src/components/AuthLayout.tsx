import type { ReactNode } from 'react'
import ComponentBody from './ComponentBody'

// --- Tipos e Interfaces ---
interface AuthLayoutProps {
    title: string
    subtitle: string
    asideTitle: string
    asideText: string
    children: ReactNode
}

// --- Componentes Menores (Visuais) ---
function DecorativeRings() {
    return (
        <svg
            className="absolute -right-24 -top-24 h-96 w-96 text-indigo-200"
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

// --- Componente Principal ---
export default function AuthLayout({
    title,
    subtitle,
    asideTitle,
    asideText,
    children,
}: AuthLayoutProps) {
    return (
        <ComponentBody>
            <div className="mx-auto grid w-full max-w-4xl overflow-hidden rounded-md border border-slate-200 bg-white md:grid-cols-[1.05fr_1fr]">
                
                {/* Painel decorativo (some no mobile) */}
                <aside className="relative hidden flex-col justify-end overflow-hidden border-r border-slate-200 bg-indigo-50 p-10 text-slate-900 md:flex">
                    <div className="bg-grid absolute inset-0" aria-hidden="true" />
                    
                    <DecorativeRings />
                    
                    <div className="relative">
                        <h2 className="font-display text-4xl font-semibold leading-[1.1] tracking-tight">
                            {asideTitle}
                        </h2>
                        <p className="mt-4 max-w-xs text-slate-600">{asideText}</p>
                    </div>
                </aside>

                {/* Área principal de conteúdo (Formulário de Auth) */}
                <section className="flex flex-col justify-center p-6 sm:p-10">
                    <header>
                        <h1 className="font-display text-3xl font-semibold tracking-tight text-slate-900">
                            {title}
                        </h1>
                        <p className="mb-8 mt-2 text-slate-600">{subtitle}</p>
                    </header>
                    
                    <main>
                        {children}
                    </main>
                </section>
                
            </div>
        </ComponentBody>
    )
}
