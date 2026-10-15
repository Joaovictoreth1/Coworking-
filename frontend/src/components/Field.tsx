interface FieldProps {
    label: string
    type?: string
    value: string
    onChange: (value: string) => void
    error?: string
    autoComplete?: string
}

export default function Field({
    label,
    type = 'text',
    value,
    onChange,
    error,
    autoComplete,
}: FieldProps) {
    return (
        <label className="block">
            <span className="text-sm font-medium text-gray-300">{label}</span>
            <input
                type={type}
                value={value}
                autoComplete={autoComplete}
                onChange={(e) => onChange(e.target.value)}
                className={`mt-1 w-full rounded-lg border bg-gray-950 px-3 py-2 text-white outline-none transition focus:border-blue-500 ${
                    error ? 'border-red-500' : 'border-gray-700'
                }`}
            />
            {error && <span className="mt-1 block text-sm text-red-400">{error}</span>}
        </label>
    )
}
