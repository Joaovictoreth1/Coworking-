// Recado de uma tela para a próxima (ex.: "Local salvo" depois de voltar para a lista).
export interface Flash {
    type: 'success' | 'error'
    text: string
}

let current: Flash | null = null

export const setFlash = (flash: Flash) => {
    current = flash
}
// Ler não limpa: o StrictMode do React chama os inicializadores duas vezes em dev.
export const peekFlash = () => current
export const clearFlash = () => {
    current = null
}
