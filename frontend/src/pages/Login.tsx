import { useState, type FormEvent } from 'react'
import { useAuth } from '../auth/context'
import AuthLayout from '../components/AuthLayout'
import Field from '../components/Field'
import { ApiError } from '../lib/api'

export default function Login({ onGoRegister }: { onGoRegister: () => void }) {
    const { login } = useAuth()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [errors, setErrors] = useState<Record<string, string[]>>({})
    const [message, setMessage] = useState('')
    const [submitting, setSubmitting] = useState(false)

    async function handleSubmit(e: FormEvent) {
        e.preventDefault()
        setErrors({})
        setMessage('')
        setSubmitting(true)
        try {
            await login(email, password)
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
            title="Entrar"
            subtitle="Acesse sua conta para continuar."
            asideTitle="Bom te ver de novo."
            asideText="Entre para continuar de onde você parou."
        >
            <form onSubmit={handleSubmit} className="space-y-5">
                <Field
                    label="E-mail"
                    type="email"
                    autoComplete="email"
                    placeholder="voce@exemplo.com"
                    value={email}
                    onChange={setEmail}
                    error={errors.email?.[0]}
                />
                <Field
                    label="Senha"
                    type="password"
                    autoComplete="current-password"
                    placeholder="Sua senha"
                    value={password}
                    onChange={setPassword}
                    error={errors.password?.[0]}
                />
                {message && (
                    <p
                        role="alert"
                        className="rounded-md border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
                    >
                        {message}
                    </p>
                )}
                <button
                    type="submit"
                    disabled={submitting}
                    className="h-11 w-full rounded-md bg-indigo-600 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60"
                >
                    {submitting ? 'Entrando...' : 'Entrar'}
                </button>
            </form>
            <p className="mt-6 text-center text-sm text-slate-600">
                Não tem conta?{' '}
                <button
                    type="button"
                    onClick={onGoRegister}
                    className="font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
                >
                    Cadastre-se
                </button>
            </p>
        </AuthLayout>
    )
}
