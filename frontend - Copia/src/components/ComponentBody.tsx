import type { ReactNode } from 'react'
import ComponentFooter from './ComponentFooter'
import ComponentNavbar from './ComponentNavbar'
import Container from './Container'

export default function ComponentBody({ children }: { children: ReactNode }) {
    return (
        <div className="flex min-h-screen flex-col bg-slate-950 text-slate-200">
            <ComponentNavbar />
            <main className="flex-1">
                <Container className="py-10 sm:py-16">{children}</Container>
            </main>
            <ComponentFooter />
        </div>
    )
}
