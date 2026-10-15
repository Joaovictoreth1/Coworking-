import type { ReactNode } from 'react'
import ComponentBody from './ComponentBody'

export default function AuthLayout({
    title,
    subtitle,
    asideTitle,
    asideText,
    children,
}: {
    title: string
    subtitle: string
    asideTitle: string
    asideText: string
    children: ReactNode
}) {
    return (
        <ComponentBody>
            <div className="mx-auto grid w-full max-w-4xl overflow-hidden rounded-md border border-slate-200 bg-white md:grid-cols-[1.05fr_1fr]">
                {/* Painel decorativo (some no mobile) */}
                <aside className="relative hidden flex-col justify-end overflow-hidden border-r border-slate-200 bg-indigo-50 p-10 text-slate-900 md:flex">
                    <div className="bg-grid absolute inset-0" aria-hidden="true" />
                    <svg
                        className="absolute -top-24 -right-24 h-96 w-96 text-indigo-200"
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
                    <div className="relative">
                        <p className="font-display text-4xl leading-[1.1] font-semibold tracking-tight">
                            {asideTitle}
                        </p>
                        <p className="mt-4 max-w-xs text-slate-600">{asideText}</p>
                    </div>
                </aside>

                <section className="p-6 sm:p-10">
                    <h1 className="font-display text-3xl font-semibold tracking-tight text-slate-900">
                        {title}
                    </h1>
                    <p className="mt-2 mb-8 text-slate-600">{subtitle}</p>
                    {children}
                </section>
            </div>
        </ComponentBody>
    )
}
