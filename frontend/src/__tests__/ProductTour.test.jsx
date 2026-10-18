import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { Navbar } from '../components/Navbar'
import { ColorModeProvider } from '../context/ColorModeContext'
import { AuthProvider } from '../context/AuthContext'
import { startProductTour } from '../utils/tour'

describe('Product Tour Feature Tests', () => {
  it('renders Start Tour button in Navbar before persona switcher', () => {
    render(
      <ColorModeProvider>
        <AuthProvider>
          <Navbar />
        </AuthProvider>
      </ColorModeProvider>
    )

    const tourBtn = screen.getByRole('button', { name: /start tour/i })
    expect(tourBtn).toBeInTheDocument()
    expect(tourBtn).toHaveAttribute('id', 'tour-nav-btn')
  })

  it('startProductTour executes without error', () => {
    expect(() => {
      startProductTour({ isDark: false })
    }).not.toThrow()
  })
})
