import { useId } from 'react'
import { PRICE_TYPES, SORT_OPTIONS, type PriceType, type SortKey } from '../lib/spaces'
import { inputClass } from '../lib/ui'

export interface FilterState {
    priceType: PriceType | ''
    minPrice: string
    maxPrice: string
    sort: SortKey
}

export const EMPTY_FILTERS: FilterState = { priceType: '', minPrice: '', maxPrice: '', sort: 'recent' }

/** Há filtro de preço ligado? (a ordenação não conta: não esconde nenhum resultado) */
export const hasPriceFilter = (f: FilterState) => f.priceType !== '' || f.minPrice !== '' || f.maxPrice !== ''

function PriceInput({
    label,
    value,
    onChange,
    disabled,
}: {
    label: string
    value: string
    onChange: (value: string) => void
    disabled: boolean
}) {
    const id = useId()
    return (
        <div className="w-32">
            <label htmlFor={id} className="mb-1 block text-xs font-medium text-slate-600">
                {label}
            </label>
            <div className="relative">
                <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-slate-500">
                    R$
                </span>
                <input
                    id={id}
                    type="text"
                    inputMode="decimal"
                    value={value}
                    disabled={disabled}
                    placeholder="0,00"
                    onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ''))}
                    className={`h-10 pl-9 text-sm ${inputClass(false)}`}
                />
            </div>
        </div>
    )
}

export default function SpaceFilters({
    value,
    onChange,
    onClear,
}: {
    value: FilterState
    onChange: (next: FilterState) => void
    onClear: () => void
}) {
    const sortId = useId()
    const isFree = value.priceType === 'free'
    const unit = PRICE_TYPES.find((t) => t.value === value.priceType)?.unit ?? ''
    const set = <K extends keyof FilterState>(key: K, v: FilterState[K]) => onChange({ ...value, [key]: v })

    return (
        <section
            aria-label="Filtros"
            className="rounded-md border border-slate-200 bg-white p-4"
        >
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div>
                    <p className="mb-1.5 text-xs font-medium text-slate-600">Como você quer pagar</p>
                    <div role="group" aria-label="Tipo de cobrança" className="flex flex-wrap gap-2">
                        {PRICE_TYPES.map((t) => {
                            const active = value.priceType === t.value
                            return (
                                <button
                                    key={t.value || 'all'}
                                    type="button"
                                    aria-pressed={active}
                                    onClick={() => set('priceType', t.value)}
                                    className={`h-10 rounded-md border px-4 text-sm font-medium transition ${
                                        active
                                            ? 'border-indigo-500 bg-indigo-50 text-indigo-800'
                                            : 'border-slate-200 text-slate-700 hover:bg-slate-100'
                                    }`}
                                >
                                    {t.label}
                                </button>
                            )
                        })}
                    </div>
                </div>

                <div className="flex flex-wrap items-end gap-3">
                    {isFree ? (
                        <p className="pb-2.5 text-sm text-slate-600">
                            Mostrando apenas espaços de entrada livre.
                        </p>
                    ) : (
                        <>
                            <PriceInput
                                label={`Preço mínimo${unit ? ` (${unit})` : ''}`}
                                value={value.minPrice}
                                onChange={(v) => set('minPrice', v)}
                                disabled={false}
                            />
                            <PriceInput
                                label={`Preço máximo${unit ? ` (${unit})` : ''}`}
                                value={value.maxPrice}
                                onChange={(v) => set('maxPrice', v)}
                                disabled={false}
                            />
                        </>
                    )}

                    <div className="w-44">
                        <label htmlFor={sortId} className="mb-1 block text-xs font-medium text-slate-600">
                            Ordenar por
                        </label>
                        <select
                            id={sortId}
                            value={value.sort}
                            onChange={(e) => set('sort', e.target.value as SortKey)}
                            className={`h-10 text-sm ${inputClass(false)} px-3`}
                        >
                            {SORT_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>
                                    {o.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {hasPriceFilter(value) && (
                        <button
                            type="button"
                            onClick={onClear}
                            className="h-10 px-1 text-sm font-medium text-indigo-600 transition hover:text-indigo-700 hover:underline"
                        >
                            Limpar filtros
                        </button>
                    )}
                </div>
            </div>
        </section>
    )
}
