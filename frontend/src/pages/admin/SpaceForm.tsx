import { useEffect, useRef, useState, type FormEvent } from 'react'
import AmenityPicker from '../../components/admin/AmenityPicker'
import { Alert, Section, Select, Switch, TextArea } from '../../components/admin/FormControls'
import PhotoManager from '../../components/admin/PhotoManager'
import WeeklySchedule from '../../components/admin/WeeklySchedule'
import ComponentBody from '../../components/ComponentBody'
import Field from '../../components/Field'
import { ArrowLeftIcon } from '../../components/icons'
import { ApiError } from '../../lib/api'
import { clearFlash, peekFlash, setFlash } from '../../lib/flash'
import { href, navigate } from '../../lib/route'
import {
    STATES,
    WEEKDAYS,
    compressImage,
    defaultSchedule,
    moneyToInput,
    parseMoney,
    spacesApi,
    type DaySchedule,
    type PhotoItem,
    type Space,
    type SpacePayload,
} from '../../lib/spaces'
import { primaryButton, secondaryButton } from '../../lib/ui'

type Errors = Record<string, string[]>

interface FormState {
    name: string
    description: string
    capacity: string
    zip_code: string
    street: string
    number: string
    complement: string
    neighborhood: string
    city: string
    state: string
    hourly_enabled: boolean
    hourly_price: string
    daily_enabled: boolean
    daily_price: string
    monthly_enabled: boolean
    monthly_price: string
    is_free: boolean
    opening_hours: DaySchedule[]
    availability: DaySchedule[]
    amenities: string[]
    is_active: boolean
}

const emptyForm = (): FormState => ({
    name: '',
    description: '',
    capacity: '',
    zip_code: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    hourly_enabled: true,
    hourly_price: '',
    daily_enabled: false,
    daily_price: '',
    monthly_enabled: false,
    monthly_price: '',
    is_free: false,
    opening_hours: defaultSchedule(),
    availability: defaultSchedule(),
    amenities: [],
    is_active: true,
})

// Garante os 7 dias na ordem de exibição, mesmo que a API devolva algo incompleto
const normalizeSchedule = (schedule: DaySchedule[]): DaySchedule[] => {
    const fallback = defaultSchedule()
    return WEEKDAYS.map(({ day }, i) => schedule.find((d) => d.day === day) ?? fallback[i])
}

const fromSpace = (s: Space): FormState => ({
    name: s.name,
    description: s.description ?? '',
    capacity: s.capacity !== null ? String(s.capacity) : '',
    zip_code: s.zip_code ?? '',
    street: s.street,
    number: s.number ?? '',
    complement: s.complement ?? '',
    neighborhood: s.neighborhood ?? '',
    city: s.city,
    state: s.state,
    hourly_enabled: s.hourly_price !== null,
    hourly_price: moneyToInput(s.hourly_price),
    daily_enabled: s.daily_price !== null,
    daily_price: moneyToInput(s.daily_price),
    monthly_enabled: s.monthly_price !== null,
    monthly_price: moneyToInput(s.monthly_price),
    is_free: s.is_free,
    opening_hours: normalizeSchedule(s.opening_hours),
    availability: normalizeSchedule(s.availability),
    amenities: s.amenities,
    is_active: s.is_active,
})

const orNull = (text: string) => text.trim() || null

const toPayload = (f: FormState): SpacePayload => ({
    name: f.name.trim(),
    description: orNull(f.description),
    capacity: f.capacity.trim() ? Number(f.capacity) : null,
    zip_code: orNull(f.zip_code),
    street: f.street.trim(),
    number: orNull(f.number),
    complement: orNull(f.complement),
    neighborhood: orNull(f.neighborhood),
    city: f.city.trim(),
    state: f.state,
    // Espaço gratuito não tem preços
    hourly_price: !f.is_free && f.hourly_enabled ? parseMoney(f.hourly_price) : null,
    daily_price: !f.is_free && f.daily_enabled ? parseMoney(f.daily_price) : null,
    monthly_price: !f.is_free && f.monthly_enabled ? parseMoney(f.monthly_price) : null,
    is_free: f.is_free,
    opening_hours: f.opening_hours,
    availability: f.availability,
    amenities: f.amenities,
    is_active: f.is_active,
})

// Mesmas regras do servidor, para avisar antes de enviar. As chaves seguem o formato da API.
function validate(f: FormState): Errors {
    const errors: Errors = {}
    const add = (key: string, message: string) => (errors[key] = [message])

    if (!f.name.trim()) add('name', 'Informe o nome do local.')
    if (f.capacity.trim() && !/^[1-9]\d*$/.test(f.capacity.trim()))
        add('capacity', 'Informe um número inteiro maior que zero.')
    if (f.zip_code.trim() && !/^\d{5}-?\d{3}$/.test(f.zip_code.trim()))
        add('zip_code', 'CEP inválido. Use o formato 00000-000.')
    if (!f.street.trim()) add('street', 'Informe a rua.')
    if (!f.city.trim()) add('city', 'Informe a cidade.')
    if (!f.state) add('state', 'Informe o estado.')

    if (!f.is_free) {
        if (!f.hourly_enabled && !f.daily_enabled && !f.monthly_enabled) {
            add('pricing', 'Escolha ao menos uma forma de cobrança (hora, dia ou mês) ou marque o local como gratuito.')
        }
        for (const kind of ['hourly', 'daily', 'monthly'] as const) {
            if (!f[`${kind}_enabled`]) continue
            const price = parseMoney(f[`${kind}_price`])
            if (price === null || price <= 0) add(`${kind}_price`, 'Informe um preço maior que zero.')
        }
    }

    for (const field of ['opening_hours', 'availability'] as const) {
        f[field].forEach((d, i) => {
            if (!d.enabled) return
            if (!d.from) add(`${field}.${i}.from`, 'Informe a hora de início.')
            if (!d.to) add(`${field}.${i}.to`, 'Informe a hora de término.')
            else if (d.from && d.to <= d.from) add(`${field}.${i}.to`, 'O término deve ser depois do início.')
        })
    }
    if (!f.availability.some((d) => d.enabled))
        add('availability', 'Marque ao menos um dia disponível para locação.')

    return errors
}

const formatZip = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 8)
    return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits
}

const firstError = (err: ApiError) => Object.values(err.errors)[0]?.[0] ?? err.message

function PriceOption({
    title,
    description,
    enabled,
    onToggle,
    value,
    onChange,
    error,
}: {
    title: string
    description: string
    enabled: boolean
    onToggle: (enabled: boolean) => void
    value: string
    onChange: (value: string) => void
    error?: string
}) {
    return (
        <div
            className={`rounded-md border p-4 transition ${
                enabled ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200'
            }`}
        >
            <div className="flex items-start gap-3">
                <Switch checked={enabled} onChange={onToggle} label={title} />
                <div>
                    <p className="text-sm font-medium text-slate-900">{title}</p>
                    <p className="text-xs text-slate-600">{description}</p>
                </div>
            </div>
            {enabled && (
                <div className="mt-4">
                    <Field
                        label="Preço"
                        prefix="R$"
                        inputMode="decimal"
                        placeholder="0,00"
                        value={value}
                        onChange={onChange}
                        error={error}
                    />
                </div>
            )}
        </div>
    )
}

export default function SpaceForm({ id }: { id: number | null }) {
    const isEdit = id !== null

    const [form, setForm] = useState<FormState>(emptyForm)
    const [photos, setPhotos] = useState<PhotoItem[]>([])
    const [removedIds, setRemovedIds] = useState<number[]>([])
    const [errors, setErrors] = useState<Errors>({})
    const [message, setMessage] = useState('')
    const [notice, setNotice] = useState(peekFlash)
    const [loading, setLoading] = useState(isEdit)
    const [loadError, setLoadError] = useState('')
    const [submitting, setSubmitting] = useState(false)

    const photosRef = useRef(photos)
    useEffect(() => {
        photosRef.current = photos
    })
    // Libera as pré-visualizações (blob:) das fotos novas ao sair da tela
    useEffect(
        () => () => {
            photosRef.current.forEach((p) => p.file && URL.revokeObjectURL(p.url))
        },
        [],
    )
    useEffect(() => {
        clearFlash()
    }, [])

    function applySpace(space: Space) {
        setForm(fromSpace(space))
        setPhotos(space.photos.map((p) => ({ key: `photo-${p.id}`, id: p.id, url: p.url })))
        setRemovedIds([])
    }

    useEffect(() => {
        if (id === null) return
        let cancelled = false
        spacesApi
            .get(id)
            .then((space) => {
                if (!cancelled) applySpace(space)
            })
            .catch((err) => {
                if (!cancelled)
                    setLoadError(err instanceof ApiError ? err.message : 'Não foi possível carregar o local.')
            })
            .finally(() => {
                if (!cancelled) setLoading(false)
            })
        return () => {
            cancelled = true
        }
    }, [id])

    const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
        setForm((f) => ({ ...f, [key]: value }))

    function scrollToFirstError() {
        setTimeout(
            () =>
                document
                    .querySelector('[data-error="true"]')
                    ?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
            50,
        )
    }

    async function lookupZip(zip: string) {
        const digits = zip.replace(/\D/g, '')
        try {
            const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
            const data = await res.json()
            if (data.erro) return
            // Só preenche o que está vazio e só se o CEP não mudou durante a consulta
            setForm((f) =>
                f.zip_code.replace(/\D/g, '') !== digits
                    ? f
                    : {
                          ...f,
                          street: f.street || data.logradouro || '',
                          neighborhood: f.neighborhood || data.bairro || '',
                          city: f.city || data.localidade || '',
                          state: f.state || data.uf || '',
                      },
            )
        } catch {
            // Sem internet ou serviço fora do ar: o endereço segue manual
        }
    }

    function changeZip(value: string) {
        const zip = formatZip(value)
        set('zip_code', zip)
        if (zip.length === 9) void lookupZip(zip)
    }

    function removePhoto(item: PhotoItem) {
        if (item.file) URL.revokeObjectURL(item.url)
        else if (item.id !== undefined) setRemovedIds((ids) => [...ids, item.id as number])
        setPhotos((list) => list.filter((p) => p.key !== item.key))
    }

    // Aplica as mudanças de fotos depois que o local foi salvo
    async function syncPhotos(spaceId: number, saved: Space) {
        for (const photoId of removedIds) await spacesApi.deletePhoto(spaceId, photoId)

        const added = photos.filter((p) => p.file)
        let current = saved
        if (added.length > 0) {
            const files = await Promise.all(added.map((p) => compressImage(p.file as File)))
            current = await spacesApi.uploadPhotos(spaceId, files)
        }

        // Descobre os ids das fotos recém-enviadas (chegam no fim, na ordem de envio)
        const known = new Set(photos.filter((p) => p.id !== undefined).map((p) => p.id))
        const fresh = current.photos
            .map((p) => p.id)
            .filter((photoId) => !known.has(photoId) && !removedIds.includes(photoId))

        let next = 0
        const wanted = photos.map((p) => p.id ?? fresh[next++])
        const finalIds = wanted.filter((photoId): photoId is number => photoId !== undefined)
        if (finalIds.length !== wanted.length) return

        const serverIds = current.photos.map((p) => p.id).filter((photoId) => !removedIds.includes(photoId))
        if (finalIds.join() !== serverIds.join()) await spacesApi.reorderPhotos(spaceId, finalIds)
    }

    async function handleSubmit(e: FormEvent) {
        e.preventDefault()
        setMessage('')
        setNotice(null)

        const clientErrors = validate(form)
        setErrors(clientErrors)
        if (Object.keys(clientErrors).length > 0) {
            setMessage('Confira os campos destacados.')
            scrollToFirstError()
            return
        }

        setSubmitting(true)
        let saved: Space | null = null
        try {
            const payload = toPayload(form)
            saved = id === null ? await spacesApi.create(payload) : await spacesApi.update(id, payload)
            await syncPhotos(saved.id, saved)

            setFlash({
                type: 'success',
                text: isEdit ? 'Local atualizado com sucesso.' : 'Local cadastrado com sucesso.',
            })
            navigate('spaces')
        } catch (err) {
            const reason =
                err instanceof ApiError ? firstError(err) : 'Erro inesperado. Tente novamente.'

            if (saved === null) {
                // Falhou ao salvar o local em si
                if (err instanceof ApiError) setErrors(err.errors)
                setMessage(
                    err instanceof ApiError && Object.keys(err.errors).length > 0
                        ? 'Confira os campos destacados.'
                        : reason,
                )
                scrollToFirstError()
            } else if (id === null) {
                // Local criado, fotos não: abre a edição dele para tentar de novo
                setFlash({
                    type: 'error',
                    text: `O local foi cadastrado, mas as fotos não foram enviadas: ${reason}`,
                })
                navigate('space-edit', saved.id)
            } else {
                // Local atualizado, fotos não: recarrega o estado real do servidor
                setNotice({
                    type: 'error',
                    text: `As alterações foram salvas, mas houve um problema com as fotos: ${reason}`,
                })
                try {
                    applySpace(await spacesApi.get(saved.id))
                } catch {
                    // mantém a tela como está
                }
            }
        } finally {
            setSubmitting(false)
        }
    }

    const pricingError =
        errors.pricing?.[0] ??
        (!form.is_free && !form.hourly_enabled && !form.daily_enabled && !form.monthly_enabled
            ? errors.hourly_price?.[0]
            : undefined)

    return (
        <ComponentBody>
            <div className="mx-auto max-w-5xl">
                <a
                    href={href('spaces')}
                    className="inline-flex items-center gap-1.5 text-sm text-slate-600 transition hover:text-slate-900"
                >
                    <ArrowLeftIcon className="h-4 w-4" />
                    Voltar para locais
                </a>
                <h1 className="font-display mt-3 text-3xl font-semibold tracking-tight text-slate-900">
                    {isEdit ? 'Editar local' : 'Novo local'}
                </h1>

                {notice && (
                    <div className="mt-6">
                        <Alert type={notice.type} onClose={() => setNotice(null)}>
                            {notice.text}
                        </Alert>
                    </div>
                )}

                {loading && <p className="mt-10 text-slate-600">Carregando...</p>}

                {loadError && (
                    <div className="mt-6">
                        <Alert type="error">{loadError}</Alert>
                    </div>
                )}

                {!loading && !loadError && (
                    <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-6">
                        <Section title="Informações básicas">
                            <Field
                                label="Nome do local"
                                placeholder="Ex.: Sala de reunião Paulista"
                                value={form.name}
                                onChange={(v) => set('name', v)}
                                error={errors.name?.[0]}
                            />
                            <TextArea
                                label="Descrição"
                                placeholder="Conte o que torna o espaço especial, para que tipo de uso ele serve..."
                                maxLength={5000}
                                value={form.description}
                                onChange={(v) => set('description', v)}
                                error={errors.description?.[0]}
                            />
                            <div className="sm:w-1/2">
                                <Field
                                    label="Capacidade (pessoas)"
                                    inputMode="numeric"
                                    placeholder="Ex.: 8"
                                    hint="Opcional."
                                    value={form.capacity}
                                    onChange={(v) => set('capacity', v.replace(/\D/g, '').slice(0, 6))}
                                    error={errors.capacity?.[0]}
                                />
                            </div>
                        </Section>

                        <Section
                            title="Endereço"
                            description="Digite o CEP para preencher rua, bairro e cidade automaticamente."
                        >
                            <div className="sm:w-1/2">
                                <Field
                                    label="CEP"
                                    inputMode="numeric"
                                    placeholder="00000-000"
                                    autoComplete="postal-code"
                                    value={form.zip_code}
                                    onChange={changeZip}
                                    error={errors.zip_code?.[0]}
                                />
                            </div>
                            <div className="grid gap-5 sm:grid-cols-6">
                                <div className="sm:col-span-4">
                                    <Field
                                        label="Rua"
                                        autoComplete="address-line1"
                                        value={form.street}
                                        onChange={(v) => set('street', v)}
                                        error={errors.street?.[0]}
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <Field
                                        label="Número"
                                        placeholder="S/N"
                                        maxLength={20}
                                        value={form.number}
                                        onChange={(v) => set('number', v)}
                                        error={errors.number?.[0]}
                                    />
                                </div>
                                <div className="sm:col-span-3">
                                    <Field
                                        label="Complemento"
                                        placeholder="Andar, sala..."
                                        maxLength={100}
                                        value={form.complement}
                                        onChange={(v) => set('complement', v)}
                                        error={errors.complement?.[0]}
                                    />
                                </div>
                                <div className="sm:col-span-3">
                                    <Field
                                        label="Bairro"
                                        maxLength={100}
                                        value={form.neighborhood}
                                        onChange={(v) => set('neighborhood', v)}
                                        error={errors.neighborhood?.[0]}
                                    />
                                </div>
                                <div className="sm:col-span-4">
                                    <Field
                                        label="Cidade"
                                        maxLength={100}
                                        value={form.city}
                                        onChange={(v) => set('city', v)}
                                        error={errors.city?.[0]}
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <Select
                                        label="Estado"
                                        placeholder="UF"
                                        value={form.state}
                                        onChange={(v) => set('state', v)}
                                        options={STATES.map((uf) => ({ value: uf, label: uf }))}
                                        error={errors.state?.[0]}
                                    />
                                </div>
                            </div>
                        </Section>

                        <Section
                            title="Preços e disponibilidade"
                            description="Escolha como o local pode ser alugado (ou se é gratuito) e em quais dias e horários ele fica disponível."
                        >
                            <div
                                className={`flex items-start gap-3 rounded-md border p-4 transition ${
                                    form.is_free ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200'
                                }`}
                            >
                                <Switch
                                    checked={form.is_free}
                                    onChange={(v) => set('is_free', v)}
                                    label="Espaço 100% gratuito"
                                />
                                <div>
                                    <p className="text-sm font-medium text-slate-900">Espaço 100% gratuito</p>
                                    <p className="text-xs text-slate-600">
                                        Para bibliotecas públicas, centros culturais e outros locais de entrada livre.
                                        Os preços ficam desativados.
                                    </p>
                                </div>
                            </div>

                            <div className={form.is_free ? 'hidden' : ''}>
                                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                                    <PriceOption
                                        title="Locação por hora"
                                        description="Cobra pelo período em horas."
                                        enabled={form.hourly_enabled}
                                        onToggle={(v) => set('hourly_enabled', v)}
                                        value={form.hourly_price}
                                        onChange={(v) => set('hourly_price', v)}
                                        error={errors.hourly_price?.[0]}
                                    />
                                    <PriceOption
                                        title="Locação por dia"
                                        description="Cobra pelo dia inteiro."
                                        enabled={form.daily_enabled}
                                        onToggle={(v) => set('daily_enabled', v)}
                                        value={form.daily_price}
                                        onChange={(v) => set('daily_price', v)}
                                        error={errors.daily_price?.[0]}
                                    />
                                    <PriceOption
                                        title="Pacote mensal"
                                        description="Cobra um valor fixo por mês de uso."
                                        enabled={form.monthly_enabled}
                                        onToggle={(v) => set('monthly_enabled', v)}
                                        value={form.monthly_price}
                                        onChange={(v) => set('monthly_price', v)}
                                        error={errors.monthly_price?.[0]}
                                    />
                                </div>
                                {pricingError && (
                                    <p data-error="true" className="mt-2 text-sm text-red-600">
                                        {pricingError}
                                    </p>
                                )}
                            </div>

                            <div>
                                <h3 className="text-sm font-medium text-slate-700">
                                    Dias e horários disponíveis para locação
                                </h3>
                                <p className="mt-1 mb-3 text-xs text-slate-500">
                                    Na locação por hora vale a faixa de horário de cada dia; nas locações por
                                    dia e mensal vale apenas o dia marcado.
                                </p>
                                <WeeklySchedule
                                    name="availability"
                                    offLabel="Indisponível"
                                    value={form.availability}
                                    onChange={(v) => set('availability', v)}
                                    errors={errors}
                                    actions={
                                        <button
                                            type="button"
                                            onClick={() =>
                                                set(
                                                    'availability',
                                                    form.opening_hours.map((d) => ({ ...d })),
                                                )
                                            }
                                            className="text-sm font-medium text-indigo-600 transition hover:text-indigo-700 hover:underline"
                                        >
                                            Copiar do horário de funcionamento
                                        </button>
                                    }
                                />
                            </div>
                        </Section>

                        <Section
                            title="Horário de funcionamento"
                            description="Quando o local está aberto. É a informação mostrada ao cliente."
                        >
                            <WeeklySchedule
                                name="opening_hours"
                                offLabel="Fechado"
                                value={form.opening_hours}
                                onChange={(v) => set('opening_hours', v)}
                                errors={errors}
                            />
                        </Section>

                        <Section title="Comodidades" description="Marque o que o local oferece.">
                            <AmenityPicker
                                value={form.amenities}
                                onChange={(v) => set('amenities', v)}
                                error={errors.amenities?.[0]}
                            />
                        </Section>

                        <Section title="Fotos">
                            <PhotoManager
                                photos={photos}
                                onChange={setPhotos}
                                onRemove={removePhoto}
                                error={errors.photos?.[0]}
                            />
                        </Section>

                        <Section title="Publicação">
                            <div className="flex items-start gap-3">
                                <Switch
                                    checked={form.is_active}
                                    onChange={(v) => set('is_active', v)}
                                    label="Local ativo"
                                />
                                <div>
                                    <p className="text-sm font-medium text-slate-900">
                                        {form.is_active ? 'Local ativo' : 'Local inativo'}
                                    </p>
                                    <p className="text-xs text-slate-600">
                                        Locais inativos continuam cadastrados, mas ficam fora da oferta.
                                    </p>
                                </div>
                            </div>
                        </Section>

                        <div className="sticky bottom-0 z-30 -mx-4 border-t border-slate-200 bg-white px-4 py-3 sm:-mx-6 sm:px-6">
                            {message && (
                                <p role="alert" className="mb-3 text-sm text-red-700">
                                    {message}
                                </p>
                            )}
                            <div className="flex justify-end gap-3">
                                <a href={href('spaces')} className={secondaryButton}>
                                    Cancelar
                                </a>
                                <button type="submit" disabled={submitting} className={primaryButton}>
                                    {submitting
                                        ? 'Salvando...'
                                        : isEdit
                                          ? 'Salvar alterações'
                                          : 'Cadastrar local'}
                                </button>
                            </div>
                        </div>
                    </form>
                )}
            </div>
        </ComponentBody>
    )
}
