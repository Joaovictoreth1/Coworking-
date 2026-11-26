import { useRef, useState } from 'react'
import BookingHistoryCard from '../components/BookingHistoryCard'
import BookingVoucherDialog from '../components/BookingVoucherDialog'
import CancelBookingDialog from '../components/CancelBookingDialog'
import ComponentBody from '../components/ComponentBody'
import { BookingCardSkeleton } from '../components/Skeleton'
import { useCancelBookingMutation, useUserBookingsQuery } from '../hooks/useBookings'
import { ApiError } from '../lib/api'
import { bookingPageRange, searchBookingPage } from '../lib/bookingHistory'
import { href } from '../lib/route'
import type { Booking } from '../lib/spaces'
import { inputClass, primaryButton, secondaryButton } from '../lib/ui'
import './bookingHistory.css'

type Status = Booking['status'] | ''
type OpenDialog = {
    kind: 'voucher' | 'cancel'
    booking: Booking
}

const FILTERS: { label: string; value: Status }[] = [
    { label: 'Todas', value: '' },
    { label: 'Confirmadas', value: 'confirmed' },
    { label: 'Pendentes', value: 'pending' },
    { label: 'Concluídas', value: 'completed' },
    { label: 'Canceladas', value: 'cancelled' },
]

export default function MyBookings() {
    const [status, setStatus] = useState<Status>('')
    const [page, setPage] = useState(1)
    const [search, setSearch] = useState('')
    const [dialog, setDialog] = useState<OpenDialog | null>(null)
    const resultsHeading = useRef<HTMLHeadingElement>(null)
    const searchInput = useRef<HTMLInputElement>(null)
    const history = useUserBookingsQuery(page, status || undefined)
    const cancellation = useCancelBookingMutation()

    const items = history.data?.data ?? []
    const metadata = history.data?.meta
    const range = metadata ? bookingPageRange(metadata, items.length) : null
    const matches = searchBookingPage(items, search)
    const searching = search.trim().length > 0
    const beyondLastPage = Boolean(metadata && page > metadata.last_page)
    const announcement = history.isPending
        ? 'Carregando reservas…'
        : !history.data
            ? ''
            : searching
                ? `${matches.length} de ${items.length} reservas nesta página correspondem à busca.`
                : range
                    ? `Reservas ${range.first}–${range.last} de ${metadata?.total}.`
                    : 'Nenhuma reserva nesta página.'

    function goToPage(nextPage: number) {
        resultsHeading.current?.focus()
        setPage(nextPage)
    }

    function clearSearch() {
        setSearch('')
        searchInput.current?.focus()
    }

    function openCancel(booking: Booking) {
        cancellation.reset()
        setDialog({ kind: 'cancel', booking })
    }

    return (
        <ComponentBody>
            <div className="mx-auto max-w-4xl space-y-6 py-4">
                <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-6">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Minhas reservas</h1>
                        <p className="mt-1 text-sm text-slate-600">
                            Acompanhe seus horários, cancelamentos e comprovantes.
                        </p>
                    </div>
                    <a href={href('home')} className={secondaryButton}>Explorar espaços</a>
                </header>

                <div className="space-y-4">
                    <fieldset className="space-y-2">
                        <legend className="text-sm font-semibold">Status das reservas</legend>
                        <div className="flex flex-wrap gap-2">
                            {FILTERS.map(({ label, value }) => (
                                <button
                                    key={value}
                                    type="button"
                                    aria-pressed={status === value}
                                    onClick={() => {
                                        if (status === value) return
                                        setStatus(value)
                                        setPage(1)
                                    }}
                                    className={`min-h-11 rounded-xl px-4 text-sm font-medium ${status === value
                                        ? 'bg-slate-900 text-white'
                                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </fieldset>
                    <div className="max-w-md space-y-2">
                        <label htmlFor="booking-search" className="block text-sm font-semibold">
                            Buscar nesta página
                        </label>
                        <input
                            id="booking-search"
                            ref={searchInput}
                            type="search"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            autoComplete="off"
                            placeholder="Espaço, cidade ou código"
                            aria-describedby="booking-search-help"
                            className={inputClass(false, 'min-h-11')}
                        />
                        <p id="booking-search-help" className="text-xs text-slate-600">
                            A busca filtra só as reservas da página exibida.
                        </p>
                    </div>
                </div>

                <section
                    className="space-y-4"
                    aria-labelledby="booking-results-title"
                    aria-busy={history.isPending && history.isFetching}
                >
                    <div>
                        <h2 id="booking-results-title" ref={resultsHeading} tabIndex={-1} className="text-lg font-bold">
                            Histórico de reservas
                        </h2>
                        <p role="status" className="min-h-5 text-sm text-slate-600">{announcement}</p>
                    </div>

                    {history.isError && (
                        <div role="alert" className="space-y-3 rounded-xl border border-rose-200 bg-rose-50 p-4">
                            <p className="font-semibold text-rose-800">
                                {history.data ? 'Não foi possível atualizar o histórico.' : 'Não foi possível carregar suas reservas.'}
                            </p>
                            <p className="text-sm text-rose-800">
                                {history.data ? 'Os dados exibidos podem estar desatualizados.'
                                    : history.error instanceof ApiError ? history.error.message
                                        : 'Verifique a conexão e tente novamente.'}
                            </p>
                            <button
                                type="button"
                                onClick={() => void history.refetch()}
                                disabled={history.isFetching}
                                className={secondaryButton}
                            >
                                {history.isFetching ? 'Recarregando…' : 'Tentar novamente'}
                            </button>
                            {!history.data && page !== 1 && (
                                <button type="button" className={secondaryButton} onClick={() => goToPage(1)}>
                                    Voltar à primeira página
                                </button>
                            )}
                        </div>
                    )}

                    {history.isPending && (
                        <div aria-hidden="true" className="space-y-3">
                            <BookingCardSkeleton />
                            <BookingCardSkeleton />
                        </div>
                    )}

                    {history.data && (matches.length ? (
                        <ul className="space-y-3">
                            {matches.map((booking) => (
                                <li key={booking.id}>
                                    <BookingHistoryCard
                                        booking={booking}
                                        onVoucher={() => setDialog({ kind: 'voucher', booking })}
                                        onCancel={() => openCancel(booking)}
                                    />
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6">
                            <h3 className="font-semibold">
                                {beyondLastPage ? 'Esta página não está mais disponível.'
                                    : searching ? 'Nenhum resultado nesta página.'
                                        : status ? 'Nenhuma reserva com este status.' : 'Você ainda não tem reservas.'}
                            </h3>
                            {beyondLastPage ? (
                                <button type="button" className={secondaryButton} onClick={() => goToPage(1)}>
                                    Voltar à primeira página
                                </button>
                            ) : searching ? (
                                <button type="button" className={secondaryButton} onClick={clearSearch}>
                                    Limpar busca
                                </button>
                            ) : status ? (
                                <button type="button" className={secondaryButton} onClick={() => {
                                    setStatus('')
                                    goToPage(1)
                                }}>
                                    Mostrar todos os status
                                </button>
                            ) : (
                                <a href={href('home')} className={primaryButton}>Ver espaços disponíveis</a>
                            )}
                        </div>
                    ))}

                    {metadata && metadata.last_page > 1 && !beyondLastPage && (
                        <nav aria-label="Páginas do histórico" className="flex flex-wrap items-center justify-between gap-2">
                            <button
                                type="button"
                                disabled={page <= 1}
                                className={secondaryButton}
                                onClick={() => goToPage(page - 1)}
                            >
                                Anterior
                            </button>
                            <span className="text-sm text-slate-700">
                                Página {metadata.current_page} de {metadata.last_page}
                            </span>
                            <button
                                type="button"
                                disabled={page >= metadata.last_page}
                                className={secondaryButton}
                                onClick={() => goToPage(page + 1)}
                            >
                                Próxima
                            </button>
                        </nav>
                    )}
                </section>
            </div>

            {dialog?.kind === 'voucher' && (
                <BookingVoucherDialog booking={dialog.booking} onDismiss={() => setDialog(null)} />
            )}
            {dialog?.kind === 'cancel' && (
                <CancelBookingDialog
                    booking={dialog.booking}
                    busy={cancellation.isPending}
                    error={cancellation.error}
                    onDismiss={() => setDialog(null)}
                    onConfirm={(bookingId, reason) => cancellation.mutate(
                        { bookingId, reason },
                        { onSuccess: () => setDialog(null) },
                    )}
                />
            )}
        </ComponentBody>
    )
}
