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
        <AuthLayout title="Entrar" subtitle="Acesse sua conta para continuar.">
            <form onSubmit={handleSubmit} className="space-y-4">
                <Field
                    label="E-mail"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={setEmail}
                    error={errors.email?.[0]}
                />
                <Field
                    label="Senha"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={setPassword}
                    error={errors.password?.[0]}
                />
                {message && <p className="text-sm text-red-400">{message}</p>}
                <button
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded-lg bg-blue-600 px-5 py-2 font-medium transition hover:bg-blue-700 disabled:opacity-60"
                >
                    {submitting ? 'Entrando...' : 'Entrar'}
                </button>
            </form>
            <p className="mt-6 text-center text-sm text-gray-400">
                Não tem conta?{' '}
                <button onClick={onGoRegister} className="text-blue-500 hover:underline">
                    Cadastre-se
                </button>
            </p>
        </AuthLayout>
    )
}
