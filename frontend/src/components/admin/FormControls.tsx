import { forwardRef, useId, type ReactNode, type TextareaHTMLAttributes, type SelectHTMLAttributes, type ButtonHTMLAttributes } from 'react'
import { inputClass } from '../../lib/ui'

// ==========================================
// 1. SECTION
// ==========================================
export interface SectionProps extends React.HTMLAttributes<HTMLElement> {
    title: string
    description?: string
    children: ReactNode
}

export function Section({ title, description, children, className = '', ...props }: SectionProps) {
    const titleId = useId()
    
    return (
        <section 
            aria-labelledby={titleId}
            className={`rounded-md border border-slate-200 bg-white p-5 sm:p-6 ${className}`}
            {...props}
        >
            <h2 id={titleId} className="font-display text-lg font-semibold tracking-tight text-slate-900">
                {title}
            </h2>
            {description && <p className="mt-1 text-sm text-slate-600">{description}</p>}
            <div className="mt-5 space-y-5">{children}</div>
        </section>
    )
}

// ==========================================
// 2. ALERT
// ==========================================
export interface AlertProps {
    type: 'success' | 'error'
    children: ReactNode
    onClose?: () => void
    className?: string
}

export function Alert({ type, children, onClose, className = '' }: AlertProps) {
    const isError = type === 'error'
    const colorClasses = isError
        ? 'border-red-200 bg-red-50 text-red-700'
        : 'border-emerald-200 bg-emerald-50 text-emerald-700'

    return (
        <div
            role={isError ? 'alert' : 'status'}
            aria-live={isError ? 'assertive' : 'polite'}
            className={`flex items-start justify-between gap-3 rounded-md border px-3.5 py-2.5 text-sm ${colorClasses} ${className}`}
        >
            <span>{children}</span>
            {onClose && (
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Fechar aviso"
                    className="shrink-0 rounded-sm opacity-70 transition hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-current focus:ring-offset-1"
                >
                    ✕
                </button>
            )}
        </div>
    )
}

// ==========================================
// 3. SWITCH
// ==========================================
// Estendemos ButtonHTMLAttributes para herdar 'disabled', 'name', 'onBlur', etc.
export interface SwitchProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
    checked: boolean
    onChange: (checked: boolean) => void
    label: string
}

export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(
    ({ checked, onChange, label, disabled, className = '', ...props }, ref) => {
        return (
            <button
                ref={ref}
                type="button"
                role="switch"
                aria-checked={checked}
                aria-label={label}
                disabled={disabled}
                onClick={() => onChange(!checked)}
                className={`relative h-6 w-11 shrink-0 rounded-full transition focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                    checked ? 'bg-indigo-500' : 'bg-slate-300'
                } ${className}`}
                {...props}
            >
                <span
                    className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                        checked ? 'translate-x-5' : 'translate-x-0'
                    }`}
                />
            </button>
        )
    }
)
Switch.displayName = 'Switch'

// ==========================================
// 4. TEXTAREA
// ==========================================
export interface TextAreaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
    label: string
    value: string
    onChange: (value: string) => void
    error?: string
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
    ({ label, value, onChange, error, className = '', disabled, ...props }, ref) => {
        const id = useId()
        const errorId = `${id}-error`

        return (
            <div className={className}>
                <label 
                    htmlFor={id} 
                    className={`text-sm font-medium ${disabled ? 'text-slate-400' : 'text-slate-700'}`}
                >
                    {label}
                </label>
                <textarea
                    ref={ref}
                    id={id}
                    value={value}
                    disabled={disabled}
                    aria-invalid={!!error}
                    aria-describedby={error ? errorId : undefined}
                    onChange={(e) => onChange(e.target.value)}
                    className={`mt-1.5 w-full py-2.5 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 ${inputClass(!!error)}`}
                    {...props}
                />
                {error && (
                    <p id={errorId} data-error="true" className="mt-1.5 text-sm text-red-600">
                        {error}
                    </p>
                )}
            </div>
        )
    }
)
TextArea.displayName = 'TextArea'

// ==========================================
// 5. SELECT
// ==========================================
export interface SelectOption {
    value: string
    label: string
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
    label: string
    value: string
    onChange: (value: string) => void
    options: SelectOption[]
    error?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
    ({ label, value, onChange, options, error, placeholder, className = '', disabled, ...props }, ref) => {
        const id = useId()
        const errorId = `${id}-error`

        return (
            <div className={className}>
                <label 
                    htmlFor={id} 
                    className={`text-sm font-medium ${disabled ? 'text-slate-400' : 'text-slate-700'}`}
                >
                    {label}
                </label>
                <select
                    ref={ref}
                    id={id}
                    value={value}
                    disabled={disabled}
                    aria-invalid={!!error}
                    aria-describedby={error ? errorId : undefined}
                    onChange={(e) => onChange(e.target.value)}
                    className={`mt-1.5 h-11 w-full disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 ${inputClass(!!error)}`}
                    {...props}
                >
                    {placeholder !== undefined && (
                        <option value="" disabled>
                            {placeholder}
                        </option>
                    )}
                    {options.map((o) => (
                        <option key={o.value} value={o.value}>
                            {o.label}
                        </option>
                    )}
                </select>
                {error && (
                    <p id={errorId} data-error="true" className="mt-1.5 text-sm text-red-600">
                        {error}
                    </p>
                )}
            </div>
        )
    }
)
Select.displayName = 'Select'
