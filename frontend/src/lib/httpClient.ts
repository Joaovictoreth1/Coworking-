import axios, { type AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'
import { ApiError, API_URL, tokenStorage } from './api'

export const httpClient: AxiosInstance = axios.create({
    baseURL: API_URL,
    headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
    },
    timeout: 15000,
})

// Anexa o Bearer token automaticamente em todas as requisições autenticadas
httpClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = tokenStorage.get()
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

// Normaliza erros em instâncias padronizadas de ApiError
httpClient.interceptors.response.use(
    (response) => response,
    (error: AxiosError<{ message?: string; errors?: Record<string, string[]> }>) => {
        if (!error.response) {
            return Promise.reject(new ApiError('Não foi possível conectar ao servidor.', 0))
        }

        const { status, data } = error.response

        // Se o token expirou ou é inválido, limpa o storage local
        if (status === 401) {
            tokenStorage.clear()
        }

        const message = data?.message ?? 'Ocorreu um erro inesperado.'
        const validationErrors = data?.errors ?? {}

        return Promise.reject(new ApiError(message, status, validationErrors))
    },
)
