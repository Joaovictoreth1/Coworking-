import { useRef, type ReactNode } from 'react'
import ComponentFooter from './ComponentFooter'
import ComponentNavbar from './ComponentNavbar'
import Container from './Container'

export default function ComponentBody({ children }: { children: ReactNode }) {
    const mainRef = useRef<HTMLElement>(null)

    return (
        <div className="flex min-h-screen flex-col bg-slate-50 text-slate-800">
            <a
                href="#main-content"
                onClick={(event) => {
                    event.preventDefault()
                    mainRef.current?.focus()
                }}
                className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-indigo-600 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white focus:shadow-lg"
            >
                Pular para o conteúdo principal
            </a>
            <ComponentNavbar />
            <main ref={mainRef} id="main-content" tabIndex={-1} className="flex-1 outline-none">
                <Container className="py-5 sm:py-6">{children}</Container>
            </main>
            <ComponentFooter />
        </div>
    )
}
