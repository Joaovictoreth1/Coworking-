import { useState } from 'react'
import { StarIcon } from './icons'

/** Estrelas somente de leitura; aceita notas fracionadas (4,5 preenche meia estrela). */
export function Stars({ value, className = 'h-4 w-4' }: { value: number; className?: string }) {
    const pct = Math.max(0, Math.min(5, value)) * 20

    return (
        <span
            className="relative inline-flex shrink-0"
            role="img"
            aria-label={`Nota ${value.toFixed(1).replace('.', ',')} de 5`}
        >
            <span className="inline-flex text-slate-300">
                {[0, 1, 2, 3, 4].map((i) => (
                    <StarIcon key={i} fill="currentColor" strokeWidth={0} className={className} />
                ))}
            </span>
            <span
                className="absolute inset-y-0 left-0 inline-flex overflow-hidden text-amber-500"
                style={{ width: `${pct}%` }}
            >
                {[0, 1, 2, 3, 4].map((i) => (
                    <StarIcon
                        key={i}
                        fill="currentColor"
                        strokeWidth={0}
                        className={`${className} shrink-0`}
                    />
                ))}
            </span>
        </span>
    )
}

const LABELS = ['Péssimo', 'Ruim', 'Regular', 'Bom', 'Excelente']

/** Seletor de nota de 1 a 5 (acessível por teclado: setas movem a seleção). */
export function StarInput({
    value,
    onChange,
    disabled = false,
}: {
    value: number
    onChange: (value: number) => void
    disabled?: boolean
}) {
    const [hover, setHover] = useState(0)
    const shown = hover || value

    return (
        <div className="flex items-center gap-3">
            <div
                role="radiogroup"
                aria-label="Sua nota"
                className="flex"
                onMouseLeave={() => setHover(0)}
            >
                {[1, 2, 3, 4, 5].map((n) => (
                    <button
                        key={n}
                        type="button"
                        role="radio"
                        aria-checked={value === n}
                        aria-label={`${n} ${n === 1 ? 'estrela' : 'estrelas'} – ${LABELS[n - 1]}`}
                        tabIndex={value === n || (value === 0 && n === 1) ? 0 : -1}
                        disabled={disabled}
                        onClick={() => onChange(n)}
                        onMouseEnter={() => setHover(n)}
                        onKeyDown={(e) => {
                            if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
                                e.preventDefault()
                                onChange(Math.min(5, (value || 0) + 1))
                            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
                                e.preventDefault()
                                onChange(Math.max(1, (value || 2) - 1))
                            }
                        }}
                        className={`p-0.5 transition disabled:opacity-50 ${
                            n <= shown ? 'text-amber-500' : 'text-slate-300 hover:text-amber-300'
                        }`}
                    >
                        <StarIcon fill="currentColor" strokeWidth={0} className="h-7 w-7" />
                    </button>
                ))}
            </div>
            <span className="min-w-20 text-sm text-slate-600">{shown ? LABELS[shown - 1] : ''}</span>
        </div>
    )
}
