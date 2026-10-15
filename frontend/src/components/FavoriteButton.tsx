import { HeartIcon } from './icons'

/** Botão de coração. "icon" é o redondo sobre a foto do card; "full" tem texto (página do local). */
export default function FavoriteButton({
    active,
    onToggle,
    variant = 'icon',
}: {
    active: boolean
    onToggle: () => void
    variant?: 'icon' | 'full'
}) {
    const label = active ? 'Remover dos favoritos' : 'Salvar nos favoritos'
    const heart = (
        <HeartIcon
            className={`h-5 w-5 transition ${active ? 'text-red-500' : ''}`}
            fill={active ? 'currentColor' : 'none'}
        />
    )

    if (variant === 'full') {
        return (
            <button
                type="button"
                onClick={onToggle}
                aria-pressed={active}
                className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800 transition hover:bg-slate-100"
            >
                {heart}
                {active ? 'Salvo nos favoritos' : 'Salvar'}
            </button>
        )
    }

    return (
        <button
            type="button"
            onClick={onToggle}
            aria-pressed={active}
            aria-label={label}
            title={label}
            className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white/95 text-slate-700 transition hover:bg-white hover:text-red-500"
        >
            {heart}
        </button>
    )
}
