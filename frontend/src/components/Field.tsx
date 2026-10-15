import { forwardRef, useId, useState, type InputHTMLAttributes } from 'react'
import { EyeIcon, EyeOffIcon } from './icons'

// --- Tipos e Interfaces ---
// Estendemos as propriedades nativas do <input>, omitindo o onChange 
// para manter a sua assinatura customizada de (value: string) => void.
export interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
    label: string
    onChange: (value: string) => void
    error?: string
    hint?: string
    prefix?: string
}

const Field = forwardRef<HTMLInputElement, FieldProps>(
    (
        {
            label,
            type = 'text',
            value,
            onChange,
            error,
            hint,
            prefix,
            disabled,
            className = '',
            ...props
        },
        ref
    ) => {
        const id = useId()
        const [visible, setVisible] = useState(false)
        const isPassword = type === 'password'

        // IDs para acessibilidade
        const errorId = `${id}-error`
        const hintId = `${id}-hint`
        const describedBy = error ? errorId : hint ? hintId : undefined

        // Organização das classes do input para melhor legibilidade
        const baseInputClasses =
            'h-11 w-full rounded-md border bg-white px-3.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500'
        
        const stateClasses = error
            ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
            : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20'

        const paddingClasses = [
            isPassword ? 'pr-11' : '',
            prefix ? 'pl-10' : '',
        ].filter(Boolean).join(' ')

        return (
            <div className={className}>
                <label
                    htmlFor={id}
                    className={`text-sm font-medium ${disabled ? 'text-slate-400' : 'text-slate-700'}`}
                >
                    {label}
                </label>
                
                <div className="relative mt-1.5">
                    {prefix && (
                        <span className={`pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm ${disabled ? 'text-slate-400' : 'text-slate-500'}`}>
                            {prefix}
                        </span>
                    )}
                    
                    <input
                        ref={ref}
                        id={id}
                        type={isPassword && visible ? 'text' : type}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        disabled={disabled}
                        aria-invalid={!!error}
                        aria-describedby={describedBy}
                        className={`${baseInputClasses} ${stateClasses} ${paddingClasses}`}
                        {...props}
                    />
                    
                    {isPassword && (
                        <button
                            type="button"
                            onClick={() => setVisible((v) => !v)}
                            disabled={disabled}
                            aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
                            className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded text-slate-500 transition hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {visible ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                        </button>
                    )}
                </div>

                {/* Exibição de Hint e Error garantindo que apenas um ocupe espaço lógico */}
                {!error && hint && (
                    <p id={hintId} className="mt-1.5 text-xs text-slate-500">
                        {hint}
                    </p>
                )}
                
                {error && (
                    <p id={errorId} data-error="true" className="mt-1.5 text-sm text-red-600">
                        {error}
                    </p>
                )}
            </div>
        )
    }
)

Field.displayName = 'Field'

export default Field
