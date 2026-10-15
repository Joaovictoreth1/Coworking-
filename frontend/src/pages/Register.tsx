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
        <AuthLayout
            title="Criar conta"
            subtitle="Preencha os dados para se cadastrar."
            asideTitle="Comece em menos de um minuto."
            asideText="Crie sua conta com nome, e-mail e uma senha. Sem complicação."
        >
            <form onSubmit={handleSubmit} className="space-y-5">
                <Field
                    label="Nome"
                    autoComplete="name"
                    placeholder="Seu nome completo"
                    value={name}
                    onChange={setName}
                    error={errors.name?.[0]}
                />
                <Field
                    label="E-mail"
                    type="email"
                    autoComplete="email"
                    placeholder="voce@exemplo.com"
                    value={email}
                    onChange={setEmail}
                    error={errors.email?.[0]}
                />
                <div className="grid gap-5 sm:grid-cols-2">
                    <Field
                        label="Senha"
                        type="password"
                        autoComplete="new-password"
                        placeholder="Crie uma senha"
                        value={password}
                        onChange={setPassword}
                        error={errors.password?.[0]}
                    />
                    <Field
                        label="Confirmar senha"
                        type="password"
                        autoComplete="new-password"
                        placeholder="Repita a senha"
                        value={confirmation}
                        onChange={setConfirmation}
                    />
                </div>
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
                    {submitting ? 'Cadastrando...' : 'Cadastrar'}
                </button>
            </form>
            <p className="mt-6 text-center text-sm text-slate-600">
                Já tem conta?{' '}
                <button
                    type="button"
                    onClick={onGoLogin}
                    className="font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
                >
                    Entrar
                </button>
            </p>
        </AuthLayout>
    )
}
