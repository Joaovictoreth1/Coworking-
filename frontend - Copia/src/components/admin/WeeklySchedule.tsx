import type { ReactNode } from 'react'
import { WEEKDAYS, type DaySchedule } from '../../lib/spaces'
import { inputClass } from '../../lib/ui'
import { Switch } from './FormControls'

const timeInput = (hasError: boolean) => `h-10 w-[7.5rem] px-2.5 ${inputClass(hasError)}`

export default function WeeklySchedule({
    name,
    value,
    onChange,
    errors,
    offLabel,
    actions,
}: {
    /** Prefixo das chaves de erro vindas da API (ex.: "opening_hours" -> "opening_hours.2.to") */
    name: string
    value: DaySchedule[]
    onChange: (next: DaySchedule[]) => void
    errors: Record<string, string[]>
    offLabel: string
    actions?: ReactNode
}) {
    const update = (day: number, patch: Partial<DaySchedule>) =>
        onChange(value.map((d) => (d.day === day ? { ...d, ...patch } : d)))

    // Copia o horário do primeiro dia marcado para todos os outros dias marcados
    const applyFirstToAll = () => {
        const first = value.find((d) => d.enabled)
        if (!first) return
        onChange(value.map((d) => (d.enabled ? { ...d, from: first.from, to: first.to } : d)))
    }

    const generalError = errors[name]?.[0]

    return (
        <div>
            <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                <button
                    type="button"
                    onClick={applyFirstToAll}
                    disabled={!value.some((d) => d.enabled)}
                    className="text-sm font-medium text-indigo-400 transition hover:text-indigo-300 hover:underline disabled:opacity-40 disabled:hover:no-underline"
                >
                    Repetir o primeiro horário nos outros dias
                </button>
                {actions}
            </div>

            <ul className="divide-y divide-white/5 rounded-xl border border-white/10 bg-slate-950/40">
                {WEEKDAYS.map(({ day, label }) => {
                    const index = value.findIndex((d) => d.day === day)
                    const entry = value[index]
                    if (!entry) return null
                    const fromError = errors[`${name}.${index}.from`]?.[0]
                    const toError = errors[`${name}.${index}.to`]?.[0]

                    return (
                        <li key={day} className="px-3.5 py-3">
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                                <div className="flex w-40 items-center gap-3">
                                    <Switch
                                        checked={entry.enabled}
                                        onChange={(enabled) => update(day, { enabled })}
                                        label={label}
                                    />
                                    <span
                                        className={`text-sm ${
                                            entry.enabled ? 'font-medium text-white' : 'text-slate-500'
                                        }`}
                                    >
                                        {label}
                                    </span>
                                </div>
                                {entry.enabled ? (
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="time"
                                            aria-label={`${label}: início`}
                                            value={entry.from}
                                            onChange={(e) => update(day, { from: e.target.value })}
                                            className={timeInput(!!fromError)}
                                        />
                                        <span className="text-sm text-slate-500">às</span>
                                        <input
                                            type="time"
                                            aria-label={`${label}: término`}
                                            value={entry.to}
                                            onChange={(e) => update(day, { to: e.target.value })}
                                            className={timeInput(!!toError)}
                                        />
                                    </div>
                                ) : (
                                    <span className="text-sm text-slate-500">{offLabel}</span>
                                )}
                            </div>
                            {(fromError || toError) && (
                                <p data-error="true" className="mt-1.5 text-sm text-red-400">
                                    {fromError ?? toError}
                                </p>
                            )}
                        </li>
                    )
                })}
            </ul>

            {generalError && (
                <p data-error="true" className="mt-2 text-sm text-red-400">
                    {generalError}
                </p>
            )}
        </div>
    )
}
