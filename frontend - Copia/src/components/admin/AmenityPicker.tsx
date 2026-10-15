import { useState } from 'react'
import { AMENITIES, amenityLabel } from '../../lib/spaces'
import { inputClass, secondaryButton } from '../../lib/ui'
import { CheckIcon, CloseIcon, PlusIcon } from '../icons'

const chip = (selected: boolean) =>
    `inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition ${
        selected
            ? 'border-indigo-400/60 bg-indigo-500/15 text-indigo-100'
            : 'border-white/10 text-slate-300 hover:bg-white/5'
    }`

export default function AmenityPicker({
    value,
    onChange,
    error,
}: {
    value: string[]
    onChange: (next: string[]) => void
    error?: string
}) {
    const [custom, setCustom] = useState('')

    const knownIds = AMENITIES.map((a) => a.id)
    const customItems = value.filter((v) => !knownIds.includes(v))

    const toggle = (id: string) =>
        onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id])

    function addCustom() {
        const text = custom.trim().slice(0, 60)
        if (!text) return
        setCustom('')

        // Se digitou algo que já existe na lista (ou já adicionou), não duplica
        const known = AMENITIES.find((a) => a.label.toLowerCase() === text.toLowerCase())
        const next = known ? known.id : text
        if (value.some((v) => v.toLowerCase() === next.toLowerCase())) return
        onChange([...value, next])
    }

    return (
        <div>
            <div className="flex flex-wrap gap-2">
                {AMENITIES.map(({ id, label }) => {
                    const selected = value.includes(id)
                    return (
                        <button
                            key={id}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => toggle(id)}
                            className={chip(selected)}
                        >
                            {selected && <CheckIcon className="h-4 w-4" />}
                            {label}
                        </button>
                    )
                })}
                {customItems.map((item) => (
                    <button
                        key={item}
                        type="button"
                        onClick={() => toggle(item)}
                        aria-label={`Remover ${amenityLabel(item)}`}
                        className={chip(true)}
                    >
                        {item}
                        <CloseIcon className="h-4 w-4" />
                    </button>
                ))}
            </div>

            <div className="mt-4 flex gap-2">
                <input
                    type="text"
                    value={custom}
                    maxLength={60}
                    placeholder="Outra comodidade (ex.: Sala de descompressão)"
                    aria-label="Adicionar outra comodidade"
                    onChange={(e) => setCustom(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault() // não envia o formulário
                            addCustom()
                        }
                    }}
                    className={`h-11 ${inputClass(false)}`}
                />
                <button type="button" onClick={addCustom} className={secondaryButton}>
                    <PlusIcon className="h-4 w-4" />
                    Adicionar
                </button>
            </div>

            {error && (
                <p data-error="true" className="mt-2 text-sm text-red-400">
                    {error}
                </p>
            )}
        </div>
    )
}
