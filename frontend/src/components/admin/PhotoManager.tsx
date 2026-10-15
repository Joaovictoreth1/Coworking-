import { useState, type ChangeEvent } from 'react'
import { MAX_PHOTOS, type PhotoItem } from '../../lib/spaces'
import {
    ChevronLeftIcon,
    ChevronRightIcon,
    StarIcon,
    TrashIcon,
    UploadIcon,
} from '../icons'

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp']
const MAX_ORIGINAL_BYTES = 25 * 1024 * 1024 // antes da compressão

let counter = 0

const iconButton =
    'grid h-8 w-8 place-items-center rounded text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 disabled:hover:bg-transparent'

export default function PhotoManager({
    photos,
    onChange,
    onRemove,
    error,
}: {
    photos: PhotoItem[]
    onChange: (next: PhotoItem[]) => void
    onRemove: (item: PhotoItem) => void
    error?: string
}) {
    const [notice, setNotice] = useState('')

    function handleFiles(e: ChangeEvent<HTMLInputElement>) {
        const picked = Array.from(e.target.files ?? [])
        e.target.value = '' // permite escolher o mesmo arquivo de novo depois

        const problems: string[] = []
        const valid = picked.filter((file) => {
            if (!ACCEPTED.includes(file.type)) {
                problems.push(`"${file.name}" não é JPG, PNG ou WebP.`)
                return false
            }
            if (file.size > MAX_ORIGINAL_BYTES) {
                problems.push(`"${file.name}" é grande demais (máx. 25 MB).`)
                return false
            }
            return true
        })

        const room = MAX_PHOTOS - photos.length
        if (valid.length > room) problems.push(`Limite de ${MAX_PHOTOS} fotos por local.`)

        const items = valid.slice(0, Math.max(room, 0)).map<PhotoItem>((file) => ({
            key: `new-${Date.now()}-${counter++}`,
            url: URL.createObjectURL(file),
            file,
        }))

        setNotice(problems.join(' '))
        if (items.length) onChange([...photos, ...items])
    }

    function move(index: number, to: number) {
        const next = [...photos]
        const [item] = next.splice(index, 1)
        next.splice(to, 0, item)
        onChange(next)
    }

    const message = error ?? notice

    return (
        <div>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {photos.map((photo, index) => (
                    <li
                        key={photo.key}
                        className="overflow-hidden rounded-md border border-slate-200 bg-white"
                    >
                        <div className="relative aspect-[4/3] bg-slate-100">
                            <img
                                src={photo.url}
                                alt={`Foto ${index + 1}`}
                                className="h-full w-full object-cover"
                            />
                            {index === 0 && (
                                <span className="absolute top-2 left-2 rounded bg-indigo-600 px-2.5 py-0.5 text-xs font-medium text-white">
                                    Capa
                                </span>
                            )}
                            {photo.file && (
                                <span className="absolute top-2 right-2 rounded border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-700">
                                    Nova
                                </span>
                            )}
                        </div>
                        <div className="flex items-center justify-between px-1.5 py-1">
                            <div className="flex">
                                <button
                                    type="button"
                                    aria-label="Mover para a esquerda"
                                    disabled={index === 0}
                                    onClick={() => move(index, index - 1)}
                                    className={iconButton}
                                >
                                    <ChevronLeftIcon className="h-4 w-4" />
                                </button>
                                <button
                                    type="button"
                                    aria-label="Mover para a direita"
                                    disabled={index === photos.length - 1}
                                    onClick={() => move(index, index + 1)}
                                    className={iconButton}
                                >
                                    <ChevronRightIcon className="h-4 w-4" />
                                </button>
                                <button
                                    type="button"
                                    aria-label="Definir como capa"
                                    title="Definir como capa"
                                    disabled={index === 0}
                                    onClick={() => move(index, 0)}
                                    className={iconButton}
                                >
                                    <StarIcon className="h-4 w-4" />
                                </button>
                            </div>
                            <button
                                type="button"
                                aria-label="Remover foto"
                                onClick={() => onRemove(photo)}
                                className={`${iconButton} hover:!bg-red-100 hover:!text-red-700`}
                            >
                                <TrashIcon className="h-4 w-4" />
                            </button>
                        </div>
                    </li>
                ))}

                {photos.length < MAX_PHOTOS && (
                    <li>
                        <label className="flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-slate-300 text-sm text-slate-600 transition focus-within:border-indigo-500 hover:border-indigo-300 hover:bg-slate-100 hover:text-slate-800">
                            <UploadIcon className="h-6 w-6" />
                            <span>Adicionar fotos</span>
                            <input
                                type="file"
                                multiple
                                accept={ACCEPTED.join(',')}
                                onChange={handleFiles}
                                className="sr-only"
                            />
                        </label>
                    </li>
                )}
            </ul>

            <p className="mt-3 text-xs text-slate-500">
                JPG, PNG ou WebP, até {MAX_PHOTOS} fotos. A primeira é a capa; as fotos são reduzidas
                automaticamente antes do envio.
            </p>
            {message && (
                <p data-error="true" className="mt-2 text-sm text-red-600">
                    {message}
                </p>
            )}
        </div>
    )
}
