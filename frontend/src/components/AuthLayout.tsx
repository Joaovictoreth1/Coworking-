import type { ReactNode } from 'react'

export default function AuthLayout({
    title,
    subtitle,
    children,
}: {
    title: string
    subtitle: string
    children: ReactNode
}) {
    return (
        <main className="flex min-h-screen items-center justify-center bg-gray-950 px-4 text-white">
            <div className="w-full max-w-sm rounded-xl border border-gray-800 bg-gray-900 p-8 shadow-xl">
                <h1 className="text-2xl font-bold text-blue-500">{title}</h1>
                <p className="mt-1 mb-6 text-sm text-gray-400">{subtitle}</p>
                {children}
            </div>
        </main>
    )
}
