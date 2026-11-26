export function formatBookingDate(iso: string, timeZone: string) {
    return new Date(iso).toLocaleDateString('pt-BR', {
        timeZone,
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    })
}

export function formatBookingTime(iso: string, timeZone: string) {
    return new Date(iso).toLocaleTimeString('pt-BR', {
        timeZone,
        hour: '2-digit',
        minute: '2-digit',
    })
}
