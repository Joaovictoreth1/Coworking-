import { useEffect, useRef, useState, type ReactNode } from 'react'

interface DropdownProps {
    trigger: ReactNode
    triggerClassName?: string
    label?: string
    align?: 'left' | 'right'
    children: (close: () => void) => ReactNode
}

export default function Dropdown({
    trigger,
    triggerClassName = '',
    label,
    align = 'left',
    children,
}: DropdownProps) {
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)

    // Fecha ao clicar fora ou apertar Esc
    useEffect(() => {
        if (!open) return
        const onPointer = (e: PointerEvent) => {
            if (!ref.current?.contains(e.target as Node)) setOpen(false)
        }
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false)
        }
        document.addEventListener('pointerdown', onPointer)
        document.addEventListener('keydown', onKey)
        return () => {
            document.removeEventListener('pointerdown', onPointer)
            document.removeEventListener('keydown', onKey)
        }
    }, [open])

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                aria-haspopup="true"
                aria-expanded={open}
                aria-label={label}
                onClick={() => setOpen((o) => !o)}
                className={triggerClassName}
            >
                {trigger}
            </button>
            {open && (
                <div
                    className={`absolute z-50 mt-2 w-60 rounded-md border border-slate-200 bg-white p-1.5 motion-safe:animate-pop ${
                        align === 'right' ? 'right-0' : 'left-0'
                    }`}
                >
                    {children(() => setOpen(false))}
                </div>
            )}
        </div>
    )
}
