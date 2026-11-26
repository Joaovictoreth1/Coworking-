import { useId, useLayoutEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface BookingHistoryDialogProps {
    title: string
    description?: string
    busy?: boolean
    printable?: boolean
    onDismiss: () => void
    children: ReactNode
}

export default function BookingHistoryDialog({
    title,
    description,
    busy = false,
    printable = false,
    onDismiss,
    children,
}: BookingHistoryDialogProps) {
    const headingId = useId()
    const descriptionId = useId()
    const ref = useRef<HTMLDialogElement>(null)
    const heading = useRef<HTMLHeadingElement>(null)
    const pressedBackdrop = useRef(false)

    useLayoutEffect(() => {
        const dialog = ref.current
        if (!dialog) return
        const trigger = document.activeElement
        dialog.showModal()
        heading.current?.focus()
        return () => {
            dialog.close()
            if (trigger instanceof HTMLElement && trigger.isConnected) {
                trigger.focus()
            } else {
                document.getElementById('booking-results-title')?.focus()
            }
        }
    }, [])

    return createPortal(
        <dialog
            ref={ref}
            className={`fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-xl backdrop:bg-slate-900/60 ${printable ? 'booking-print-dialog' : ''}`}
            aria-labelledby={headingId}
            aria-describedby={description ? descriptionId : undefined}
            onCancel={(event) => {
                event.preventDefault()
                if (!busy) onDismiss()
            }}
            onPointerDown={(event) => {
                pressedBackdrop.current = event.target === event.currentTarget
            }}
            onClick={(event) => {
                if (!busy && pressedBackdrop.current && event.target === event.currentTarget) {
                    onDismiss()
                }
                pressedBackdrop.current = false
            }}
        >
            <div className="space-y-5 p-5 sm:p-7">
                <header className="space-y-2">
                    <h2
                        id={headingId}
                        ref={heading}
                        tabIndex={-1}
                        className="text-xl font-bold outline-none"
                    >
                        {title}
                    </h2>
                    {description && (
                        <p id={descriptionId} className="text-sm text-slate-600">
                            {description}
                        </p>
                    )}
                </header>
                {children}
            </div>
        </dialog>,
        document.body,
    )
}
