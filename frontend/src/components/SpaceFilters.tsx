import { useId } from 'react'
import { PRICE_TYPES, SORT_OPTIONS, type PriceType, type SortKey } from '../lib/spaces'
import { inputClass } from '../lib/ui'

// --- Tipos e Interfaces ---
export interface FilterState {
    priceType: PriceType | ''
    minPrice: string
    maxPrice: string
    sort: SortKey
}

interface PriceInputProps {
    label: string
    value: string
    onChange: (value: string) => void
    disabled?: boolean
}

interface SpaceFiltersProps {
    value: FilterState
    onChange: (next: FilterState) => void
    onClear: () => void
}

// --- Constantes e Utilitários ---
export const EMPTY_FILTERS: FilterState = { 
    priceType: '', 
    minPrice: '', 
    maxPrice: '', 
    sort: 'recent' 
}

/** Há filtro de preço ligado? (a ordenação não conta: não esconde nenhum resultado) */
export const hasPriceFilter = (f: FilterState) => 
    f.priceType !== '' || f.minPrice !== '' || f.maxPrice !== ''

// --- Componentes Menores ---
function PriceInput({ label, value, onChange, disabled = false }: PriceInputProps) {
    const id = useId()

    // Extraído para melhorar a leitura do JSX
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Remove tudo que não for dígito, ponto ou vírgula
        const sanitizedValue = e.target.value.replace(/[^\d.,]/g, '')
        onChange(sanitizedValue)
    }

    return (
        <div className="w-32">
            <label htmlFor={id} className="mb-1 block text-xs font-medium text-slate-600">
                {label}
            </label>
            <div className="relative">
                <span 
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500"
                    aria-hidden="true" // Oculto para leitores de tela para evitar redundância
                >
                    R$
                </span>
                <input
                    id={id}
                    type="text"
                    inputMode="decimal"
                    value={value}
                    disabled={disabled}
                    placeholder="0,00"
                    onChange={handleChange}
                    className={`h-10 w-full pl-9 text-sm ${inputClass(disabled)}`}
                />
            </div>
        </div>
    )
}

// --- Componente Principal ---
export default function SpaceFilters({ value, onChange, onClear }: SpaceFiltersProps) {
    const sortId = useId()
    
    const isFree = value.priceType === 'free'
    const unit = PRICE_TYPES.find((t) => t.value === value.priceType)?.unit ?? ''
    
    const setFilter = <K extends keyof FilterState>(key: K, newValue: FilterState[K]) => {
        onChange({ ...value, [key]: newValue })
    }

    return (
        <section
            aria-labelledby="filters-heading"
            className="rounded-md border border-slate-200 bg-white p-4"
        >
            {/* Título invisível para leitores de tela melhorar a semântica da <section> */}
            <h2 id="filters-heading" className="sr-only">Filtros de busca</h2>

            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                
                {/* Bloco: Tipo de Cobrança */}
                <div>
                    <p className="mb-1.5 text-xs font-medium text-slate-600">
                        Como você quer pagar
                    </p>
                    <div role="group" aria-label="Tipo de cobrança" className="flex flex-wrap gap-2">
                        {PRICE_TYPES.map((type) => {
                            const isActive = value.priceType === type.value
                            
                            // Lógica de classes extraída para limpeza visual
                            const buttonClasses = isActive
                                ? 'border-indigo-500 bg-indigo-50 text-indigo-800'
                                : 'border-slate-200 text-slate-700 hover:bg-slate-100'

                            return (
                                <button
                                    key={type.value || 'all'}
                                    type="button"
                                    aria-pressed={isActive}
                                    onClick={() => setFilter('priceType', type.value)}
                                    className={`h-10 rounded-md border px-4 text-sm font-medium transition ${buttonClasses}`}
                                >
                                    {type.label}
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* Bloco: Valores e Ordenação */}
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
                                onChange={(v) => setFilter('minPrice', v)}
                            />
                            <PriceInput
                                label={`Preço máximo${unit ? ` (${unit})` : ''}`}
                                value={value.maxPrice}
                                onChange={(v) => setFilter('maxPrice', v)}
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
                            onChange={(e) => setFilter('sort', e.target.value as SortKey)}
                            className={`h-10 w-full px-3 text-sm ${inputClass(false)}`}
                        >
                            {SORT_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
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
