import { useId, type ReactNode } from 'react'
import { inputClass } from '../../lib/ui'

export function Section({
    title,
    description,
    children,
}: {
    title: string
    description?: string
    children: ReactNode
}) {
    return (
        <section className="rounded-md border border-slate-200 bg-white p-5 sm:p-6">
            <h2 className="font-display text-lg font-semibold tracking-tight text-slate-900">{title}</h2>
            {description && <p className="mt-1 text-sm text-slate-600">{description}</p>}
            <div className="mt-5 space-y-5">{children}</div>
        </section>
    )
}

export function Alert({
    type,
    children,
    onClose,
}: {
    type: 'success' | 'error'
    children: ReactNode
    onClose?: () => void
}) {
    const color =
        type === 'success'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : 'border-red-200 bg-red-50 text-red-700'
    return (
        <div
            role={type === 'error' ? 'alert' : 'status'}
            className={`flex items-start justify-between gap-3 rounded-md border px-3.5 py-2.5 text-sm ${color}`}
        >
            <span>{children}</span>
            {onClose && (
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Fechar aviso"
                    className="shrink-0 text-current opacity-70 transition hover:opacity-100"
                >
                    ✕
                </button>
            )}
        </div>
    )
}

export function Switch({
    checked,
    onChange,
    label,
}: {
    checked: boolean
    onChange: (checked: boolean) => void
    label: string
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            onClick={() => onChange(!checked)}
            className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                checked ? 'bg-indigo-500' : 'bg-slate-300'
            }`}
        >
            <span
                className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                    checked ? 'translate-x-5' : ''
                }`}
            />
        </button>
    )
}

export function TextArea({
    label,
    value,
    onChange,
    error,
    placeholder,
    rows = 4,
    maxLength,
}: {
    label: string
    value: string
    onChange: (value: string) => void
    error?: string
    placeholder?: string
    rows?: number
    maxLength?: number
}) {
    const id = useId()
    return (
        <div>
            <label htmlFor={id} className="text-sm font-medium text-slate-700">
                {label}
            </label>
            <textarea
                id={id}
                value={value}
                rows={rows}
                maxLength={maxLength}
                placeholder={placeholder}
                aria-invalid={!!error}
                onChange={(e) => onChange(e.target.value)}
                className={`mt-1.5 py-2.5 ${inputClass(!!error)}`}
            />
            {error && (
                <p data-error="true" className="mt-1.5 text-sm text-red-600">
                    {error}
                </p>
            )}
        </div>
    )
}

export function Select({
    label,
    value,
    onChange,
    options,
    error,
    placeholder,
}: {
    label: string
    value: string
    onChange: (value: string) => void
    options: { value: string; label: string }[]
    error?: string
    placeholder?: string
}) {
    const id = useId()
    return (
        <div>
            <label htmlFor={id} className="text-sm font-medium text-slate-700">
                {label}
            </label>
            <select
                id={id}
                value={value}
                aria-invalid={!!error}
                onChange={(e) => onChange(e.target.value)}
                className={`mt-1.5 h-11 ${inputClass(!!error)}`}
            >
                {placeholder !== undefined && <option value="">{placeholder}</option>}
                {options.map((o) => (
                    <option key={o.value} value={o.value}>
                        {o.label}
                    </option>
                ))}
            </select>
            {error && (
                <p data-error="true" className="mt-1.5 text-sm text-red-600">
                    {error}
                </p>
            )}
        </div>
    )
}
