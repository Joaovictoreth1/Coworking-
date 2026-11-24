import { Component, type ErrorInfo, type ReactNode } from 'react'
import { navigate } from '../lib/route'
import { primaryButton, secondaryButton } from '../lib/ui'

interface ErrorBoundaryProps {
    children: ReactNode
}

interface ErrorBoundaryState {
    error: Error | null
}

/**
 * Barreira de erro de nível de aplicação: captura exceções de renderização
 * (que o React, por padrão, deixa derrubar a tela inteira) e mostra uma tela
 * amigável com recuperação, em vez de uma página em branco.
 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    state: ErrorBoundaryState = { error: null }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { error }
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        // Observabilidade: em produção, encaminhar para um serviço de erros (Sentry etc.).
        console.error('ErrorBoundary capturou um erro de renderização:', error, info)
    }

    handleReset = () => {
        // Sai da rota quebrada e volta à home antes de re-renderizar a árvore.
        navigate('home')
        this.setState({ error: null })
    }

    render() {
        if (!this.state.error) return this.props.children

        return (
            <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-slate-50 px-6 text-center text-slate-700">
                <div
                    className="grid h-14 w-14 place-items-center rounded-full bg-red-50 text-2xl"
                    aria-hidden="true"
                >
                    ⚠️
                </div>
                <div>
                    <h1 className="font-display text-2xl font-bold text-slate-900">
                        Algo deu errado
                    </h1>
                    <p className="mt-2 max-w-md text-slate-600">
                        Encontramos um erro inesperado ao exibir esta tela. Você pode tentar
                        novamente ou recarregar a página.
                    </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3">
                    <button type="button" onClick={this.handleReset} className={primaryButton}>
                        Tentar novamente
                    </button>
                    <button
                        type="button"
                        onClick={() => window.location.reload()}
                        className={secondaryButton}
                    >
                        Recarregar página
                    </button>
                </div>
            </main>
        )
    }
}
