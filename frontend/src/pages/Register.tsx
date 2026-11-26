import { useMemo, useState, type FormEvent } from 'react'
import { useAuth } from '../auth/context'
import AuthLayout from '../components/AuthLayout'
import Field from '../components/Field'
import { ApiError } from '../lib/api'

function getPasswordStrength(password: string): { label: string; score: number; color: string } {
    if (!password) return { label: '', score: 0, color: 'bg-slate-200' }
    let score = 0
    if (password.length >= 8) score += 1
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1
    if (/\d/.test(password)) score += 1
    if (/[^A-Za-z0-9]/.test(password)) score += 1

    if (score <= 1) return { label: 'Fraca', score: 1, color: 'bg-rose-500' }
    if (score === 2) return { label: 'Média', score: 2, color: 'bg-amber-500' }
    if (score === 3) return { label: 'Boa', score: 3, color: 'bg-indigo-500' }
    return { label: 'Forte', score: 4, color: 'bg-emerald-500' }
}

export default function Register({ onGoLogin }: { onGoLogin: () => void }) {
    const { register } = useAuth()
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmation, setConfirmation] = useState('')
    const [errors, setErrors] = useState<Record<string, string[]>>({})
    const [message, setMessage] = useState('')
    const [submitting, setSubmitting] = useState(false)

    const strength = useMemo(() => getPasswordStrength(password), [password])
    const confirmationMismatch = Boolean(confirmation && password !== confirmation)

    async function handleSubmit(e: FormEvent) {
        e.preventDefault()
        if (confirmationMismatch) return
        setErrors({})
        setMessage('')
        setSubmitting(true)
        try {
            await register({
                name,
                email,
                password,
                password_confirmation: confirmation,
            })
        } catch (err) {
            if (err instanceof ApiError) {
                setErrors(err.errors)
                if (Object.keys(err.errors).length === 0) setMessage(err.message)
            } else {
                setMessage('Erro inesperado.')
            }
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <AuthLayout
            title="Criar conta"
            subtitle="Preencha os dados para se cadastrar."
            asideTitle="Comece em menos de um minuto."
            asideText="Crie sua conta com nome, e-mail e uma senha. Sem complicação."
        >
            <form onSubmit={handleSubmit} className="space-y-5">
                <Field
                    label="Nome"
                    name="name"
                    autoComplete="name"
                    placeholder="Seu nome completo"
                    value={name}
                    onChange={setName}
                    error={errors.name?.[0]}
                />
                <Field
                    label="E-mail"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="voce@exemplo.com"
                    value={email}
                    onChange={setEmail}
                    error={errors.email?.[0]}
                />
                <div className="space-y-2">
                    <div className="grid gap-5 sm:grid-cols-2">
                        <Field
                            label="Senha"
                            name="password"
                            type="password"
                            autoComplete="new-password"
                            placeholder="Mínimo 8 caracteres"
                            value={password}
                            onChange={setPassword}
                            error={errors.password?.[0]}
                        />
                        <Field
                            label="Confirmar senha"
                            name="password_confirmation"
                            type="password"
                            autoComplete="new-password"
                            placeholder="Repita a senha"
                            value={confirmation}
                            onChange={setConfirmation}
                            error={confirmationMismatch ? 'As senhas não coincidem.' : undefined}
                        />
                    </div>
                    {password && (
                        <div className="space-y-1">
                            <div className="grid grid-cols-4 gap-1.5" aria-hidden="true">
                                {[1, 2, 3, 4].map((step) => (
                                    <span
                                        key={step}
                                        className={`h-1.5 rounded-full transition-colors ${
                                            step <= strength.score ? strength.color : 'bg-slate-200'
                                        }`}
                                    />
                                ))}
                            </div>
                            <p className="text-xs text-slate-500">
                                Força da senha:{' '}
                                <span className="font-semibold text-slate-700">{strength.label}</span>
                            </p>
                        </div>
                    )}
                </div>
                {message && (
                    <p
                        role="alert"
                        className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
                    >
                        {message}
                    </p>
                )}
                <button
                    type="submit"
                    disabled={submitting || confirmationMismatch}
                    className="h-11 w-full rounded-xl bg-indigo-600 font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:opacity-60 cursor-pointer"
                >
                    {submitting ? 'Cadastrando...' : 'Cadastrar'}
                </button>
            </form>
            <p className="mt-6 text-center text-sm text-slate-600">
                Já tem conta?{' '}
                <button
                    type="button"
                    onClick={onGoLogin}
                    className="font-medium text-indigo-600 hover:text-indigo-700 hover:underline cursor-pointer"
                >
                    Entrar
                </button>
            </p>
        </AuthLayout>
    )
}
