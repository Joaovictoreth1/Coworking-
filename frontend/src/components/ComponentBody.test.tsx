// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import ComponentBody from './ComponentBody'

vi.mock('./ComponentNavbar', () => ({ default: () => null }))
vi.mock('./ComponentFooter', () => ({ default: () => null }))

afterEach(() => {
    cleanup()
    history.replaceState(null, '', '/')
})

test('the skip link focuses main content without replacing the route hash', () => {
    history.replaceState(null, '', '/#/minhas-reservas')
    render(<ComponentBody>Minhas reservas</ComponentBody>)

    fireEvent.click(screen.getByRole('link', { name: 'Pular para o conteúdo principal' }))

    expect(screen.getByRole('main')).toHaveFocus()
    expect(window.location.hash).toBe('#/minhas-reservas')
})
