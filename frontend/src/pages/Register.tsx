import { useState, type FormEvent } from 'react'
import { useAuth } from '../auth/context'
import AuthLayout from '../components/AuthLayout'
import Field from '../components/Field'
import { ApiError } from '../lib/api'

export default function Register({ onGoLogin }: { onGoLogin: () => void }) {
    const { register } = useAuth()
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmation, setConfirmation] = useState('')
    const [errors, setErrors] = useState<Record<string, string[]>>({})
    const [message, setMessage] = useState('')
    const [submitting, setSubmitting] = useState(false)

    async function handleSubmit(e: FormEvent) {
        e.preventDefault()
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
        <AuthLayout title="Criar conta" subtitle="Preencha os dados para se cadastrar.">
            <form onSubmit={handleSubmit} className="space-y-4">
                <Field
                    label="Nome"
                    autoComplete="name"
                    value={name}
                    onChange={setName}
                    error={errors.name?.[0]}
                />
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
                    autoComplete="new-password"
                    value={password}
                    onChange={setPassword}
                    error={errors.password?.[0]}
                />
                <Field
                    label="Confirmar senha"
                    type="password"
                    autoComplete="new-password"
                    value={confirmation}
                    onChange={setConfirmation}
                />
                {message && <p className="text-sm text-red-400">{message}</p>}
                <button
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded-lg bg-blue-600 px-5 py-2 font-medium transition hover:bg-blue-700 disabled:opacity-60"
                >
                    {submitting ? 'Cadastrando...' : 'Cadastrar'}
                </button>
            </form>
            <p className="mt-6 text-center text-sm text-gray-400">
                Já tem conta?{' '}
                <button onClick={onGoLogin} className="text-blue-500 hover:underline">
                    Entrar
                </button>
            </p>
        </AuthLayout>
    )
}
