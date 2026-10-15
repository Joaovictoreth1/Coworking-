import ComponentBody from '../components/ComponentBody'
import { href } from '../lib/route'
import { primaryButton } from '../lib/ui'

export default function AccessDenied() {
    return (
        <ComponentBody>
            <section className="mx-auto flex max-w-lg flex-col items-center py-12 text-center sm:py-20">
                <h1 className="font-display text-4xl font-bold tracking-tight text-white">
                    Acesso restrito
                </h1>
                <p className="mt-4 text-slate-400">
                    Esta área é exclusiva para administradores. Se você deveria ter acesso, fale com quem
                    gerencia o sistema.
                </p>
                <a href={href('home')} className={`${primaryButton} mt-8`}>
                    Voltar ao início
                </a>
            </section>
        </ComponentBody>
    )
}
