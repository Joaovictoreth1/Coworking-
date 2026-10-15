import type { ReactNode } from 'react'
import ComponentFooter from './ComponentFooter'
import ComponentNavbar from './ComponentNavbar'
import Container from './Container'

export default function ComponentBody({ children }: { children: ReactNode }) {
    return (
        <div className="flex min-h-screen flex-col bg-slate-50 text-slate-800">
            <ComponentNavbar />
            <main className="flex-1">
                <Container className="py-5 sm:py-6">{children}</Container>
            </main>
            <ComponentFooter />
        </div>
    )
}
