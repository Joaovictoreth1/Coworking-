import { useId, useState } from 'react'
import { EyeIcon, EyeOffIcon } from './icons'

interface FieldProps {
    label: string
    type?: string
    value: string
    onChange: (value: string) => void
    error?: string
    autoComplete?: string
    placeholder?: string
    hint?: string
    prefix?: string
    inputMode?: 'text' | 'numeric' | 'decimal'
    maxLength?: number
    onBlur?: () => void
}

export default function Field({
    label,
    type = 'text',
    value,
    onChange,
    error,
    autoComplete,
    placeholder,
    hint,
    prefix,
    inputMode,
    maxLength,
    onBlur,
}: FieldProps) {
    const id = useId()
    const [visible, setVisible] = useState(false)
    const isPassword = type === 'password'

    return (
        <div>
            <label htmlFor={id} className="text-sm font-medium text-slate-700">
                {label}
            </label>
            <div className="relative mt-1.5">
                {prefix && (
                    <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-sm text-slate-500">
                        {prefix}
                    </span>
                )}
                <input
                    id={id}
                    type={isPassword && visible ? 'text' : type}
                    value={value}
                    autoComplete={autoComplete}
                    placeholder={placeholder}
                    inputMode={inputMode}
                    maxLength={maxLength}
                    onBlur={onBlur}
                    aria-invalid={!!error}
                    aria-describedby={error ? `${id}-error` : undefined}
                    onChange={(e) => onChange(e.target.value)}
                    className={`h-11 w-full rounded-md border bg-white px-3.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-2 ${
                        isPassword ? 'pr-11' : ''
                    } ${prefix ? 'pl-10' : ''} ${
                        error
                            ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
                            : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20'
                    }`}
                />
                {isPassword && (
                    <button
                        type="button"
                        onClick={() => setVisible((v) => !v)}
                        aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
                        className="absolute top-1/2 right-1.5 grid h-8 w-8 -translate-y-1/2 place-items-center rounded text-slate-500 transition hover:text-slate-800"
                    >
                        {visible ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                    </button>
                )}
            </div>
            {hint && !error && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>}
            {error && (
                <p id={`${id}-error`} data-error="true" className="mt-1.5 text-sm text-red-600">
                    {error}
                </p>
            )}
        </div>
    )
}
