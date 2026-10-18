import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CreateTicketModal } from '../components/CreateTicketModal'
import { AuthProvider } from '../context/AuthContext'
import client from '../api/client'

// Mock client API calls
vi.mock('../api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
}))

describe('CreateTicketModal Component Interaction Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    client.get.mockImplementation((url) => {
      if (url.includes('/auth/personas/')) {
        return Promise.resolve({
          data: {
            personas: [
              {
                id: 1,
                username: 'client_chaitanya',
                display_name: 'Chaitanya M',
                role: 'CLIENT_POC',
                role_display: 'Client POC',
                avatar_initials: 'CM',
                client: 1,
                client_name: 'Harness',
              },
            ],
          },
        })
      }
      if (url.includes('/ticketing/auxiliary-data/')) {
        return Promise.resolve({
          data: {
            clients: [
              { id: 1, name: 'Harness', occupied_floors: ['2F', '3F'], property_name: 'Harness-1317' },
            ],
            departments: [{ id: 1, name: 'Technical / HVAC' }],
            quick_issues: [
              { title: 'AC not cooling' },
              { title: 'Internet not working' },
              { title: 'Pantry not cleaned' },
              { title: 'Lights flickering' },
            ],
          },
        })
      }
      return Promise.resolve({ data: {} })
    })

    client.post.mockImplementation((url) => {
      if (url.includes('/auth/switch-persona/')) {
        return Promise.resolve({
          data: {
            user: {
              id: 1,
              username: 'client_chaitanya',
              display_name: 'Chaitanya M',
              role: 'CLIENT_POC',
              role_display: 'Client POC',
              avatar_initials: 'CM',
              client: 1,
              client_name: 'Harness',
            },
            tokens: {
              access: 'mock_jwt_access_token',
              refresh: 'mock_jwt_refresh_token',
            },
          },
        })
      }
      return Promise.resolve({
        data: { id: 101, ticket_number: 'TKT-1042', status: 'PENDING_TECHNICIAN_ASSIGNMENT' },
      })
    })
  })

  it('renders ticket creation modal and form inputs', async () => {
    render(
      <AuthProvider>
        <CreateTicketModal open={true} onClose={() => {}} onTicketCreated={() => {}} />
      </AuthProvider>
    )

    expect(screen.getByText('Create New Ticket')).toBeInTheDocument()
    expect(await screen.findByPlaceholderText('Type or search issue')).toBeInTheDocument()
    expect(screen.getByTestId('ticket-submit-btn')).toBeInTheDocument()
  })

  it('autofills issue title when quick issue pill is clicked', async () => {
    render(
      <AuthProvider>
        <CreateTicketModal open={true} onClose={() => {}} onTicketCreated={() => {}} />
      </AuthProvider>
    )

    // Wait for quick issue pills to load
    const acPill = await screen.findByTestId('quick-issue-ac-not-cooling')
    expect(acPill).toBeInTheDocument()

    // Click the AC not cooling pill
    fireEvent.click(acPill)

    // Check that Issue input field got autofilled
    const issueInput = screen.getByPlaceholderText('Type or search issue')
    expect(issueInput.value).toBe('AC not cooling')
  })

  it('disables submit button when title is blank to prevent invalid submission', async () => {
    render(
      <AuthProvider>
        <CreateTicketModal open={true} onClose={() => {}} onTicketCreated={() => {}} />
      </AuthProvider>
    )

    const submitBtn = screen.getByTestId('ticket-submit-btn')
    // When input is empty, submit button should be disabled
    expect(submitBtn).toBeDisabled()

    // Type a title
    const issueInput = await screen.findByPlaceholderText('Type or search issue')
    fireEvent.change(issueInput, { target: { value: 'Water leaking' } })

    // Now submit button should be enabled
    expect(submitBtn).not.toBeDisabled()
  })
})
