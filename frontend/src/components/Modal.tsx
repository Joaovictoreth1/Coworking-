import { useEffect, useRef, type ReactNode } from 'react'

interface ModalProps {
    /** Fecha o modal (Escape, clique no backdrop ou botões internos). */
    onClose: () => void
    /** id do elemento que rotula o diálogo (aria-labelledby). */
    labelledBy?: string
    /** id do elemento que descreve o diálogo (aria-describedby). */
    describedBy?: string
    /** Rótulo acessível quando não há um heading visível para referenciar. */
    label?: string
    /** Durante uma ação em curso, trava o fechamento por Escape/backdrop. */
    busy?: boolean
    /** Permite (ou não) fechar clicando fora do painel. Padrão: true. */
    closeOnBackdrop?: boolean
    /** Classe do painel, para cada modal manter seu próprio visual. */
    panelClassName?: string
    children: ReactNode
}

const FOCUSABLE =
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

function focusableIn(root: HTMLElement | null): HTMLElement[] {
    if (!root) return []
    return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
    )
}

/**
 * Diálogo acessível: role=dialog + aria-modal, foco preso dentro do painel
 * (Tab/Shift+Tab circulam), foco devolvido ao gatilho ao fechar, Escape, e
 * trava de rolagem do fundo. Monte-o condicionalmente ({open && <Modal/>}).
 */
export default function Modal({
    onClose,
    labelledBy,
    describedBy,
    label,
    busy = false,
    closeOnBackdrop = true,
    panelClassName = 'w-full max-w-md rounded-md border border-slate-200 bg-white p-6 shadow-xl outline-none motion-safe:animate-pop',
    children,
}: ModalProps) {
    const panelRef = useRef<HTMLDivElement>(null)
    // Mantidos atualizados sem re-disparar o efeito principal (que roda uma vez, no mount).
    const onCloseRef = useRef(onClose)
    const busyRef = useRef(busy)
    useEffect(() => {
        onCloseRef.current = onClose
        busyRef.current = busy
    })

    useEffect(() => {
        const previouslyFocused = document.activeElement as HTMLElement | null
        const panel = panelRef.current

        // Move o foco pra dentro do painel (primeiro elemento focável ou o próprio painel).
        const first = focusableIn(panel)[0]
        ;(first ?? panel)?.focus()

        const originalOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !busyRef.current) {
                e.stopPropagation()
                onCloseRef.current()
                return
            }
            if (e.key !== 'Tab') return

            const items = focusableIn(panelRef.current)
            if (items.length === 0) {
                e.preventDefault()
                return
            }
            const firstEl = items[0]
            const lastEl = items[items.length - 1]
            const active = document.activeElement

            if (e.shiftKey && (active === firstEl || !panelRef.current?.contains(active))) {
                e.preventDefault()
                lastEl.focus()
            } else if (!e.shiftKey && active === lastEl) {
                e.preventDefault()
                firstEl.focus()
            }
        }

        document.addEventListener('keydown', onKeyDown, true)
        return () => {
            document.removeEventListener('keydown', onKeyDown, true)
            document.body.style.overflow = originalOverflow
            previouslyFocused?.focus?.()
        }
    }, [])

    return (
        <div
            className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4 backdrop-blur-sm"
            onPointerDown={(e) => {
                if (closeOnBackdrop && !busyRef.current && e.target === e.currentTarget) {
                    onCloseRef.current()
                }
            }}
        >
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-label={label}
                aria-labelledby={labelledBy}
                aria-describedby={describedBy}
                tabIndex={-1}
                className={panelClassName}
            >
                {children}
            </div>
        </div>
    )
}
