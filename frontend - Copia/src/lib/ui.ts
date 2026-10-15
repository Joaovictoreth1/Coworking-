// Classes compartilhadas pelos campos de formulário (mesmo visual do componente Field).
export const inputClass = (hasError: boolean, extra = '') =>
    `w-full rounded-xl border bg-slate-950/60 px-3.5 text-white outline-none transition placeholder:text-slate-600 focus:ring-2 disabled:opacity-50 ${
        hasError
            ? 'border-red-500/70 focus:border-red-400 focus:ring-red-400/20'
            : 'border-white/10 focus:border-indigo-400 focus:ring-indigo-400/20'
    } ${extra}`

export const primaryButton =
    'inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60'

export const secondaryButton =
    'inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 px-5 font-medium text-slate-200 transition hover:bg-white/5 disabled:opacity-60'
