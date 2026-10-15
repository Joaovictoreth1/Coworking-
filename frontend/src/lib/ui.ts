// Classes compartilhadas pelos campos de formulário (mesmo visual do componente Field).
export const inputClass = (hasError: boolean, extra = '') =>
    `w-full rounded-md border bg-white px-3.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-2 disabled:opacity-50 ${
        hasError
            ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
            : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20'
    } ${extra}`

export const primaryButton =
    'inline-flex h-11 items-center justify-center gap-2 rounded-md bg-indigo-600 px-5 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60'

export const secondaryButton =
    'inline-flex h-11 items-center justify-center gap-2 rounded-md border border-slate-200 px-5 font-medium text-slate-800 transition hover:bg-slate-100 disabled:opacity-60'
