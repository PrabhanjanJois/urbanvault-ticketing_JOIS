import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import client from '../api/client'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [personas, setPersonas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // 1. Fetch available seeded personas
  const loadPersonas = useCallback(async () => {
    try {
      const res = await client.get('/auth/personas/')
      setPersonas(res.data.personas || [])
      return res.data.personas || []
    } catch (err) {
      console.error('Failed to load seeded personas:', err)
      setError('Could not load user personas from server.')
      return []
    }
  }, [])

  // 2. Switch persona with 1 click
  const switchPersona = useCallback(async (username) => {
    setLoading(true)
    setError(null)
    try {
      const res = await client.post('/auth/switch-persona/', { username })
      const newUser = res.data?.user || res.data
      const tokens = res.data?.tokens || {}

      if (tokens.access) {
        localStorage.setItem('urbanvault_access_token', tokens.access)
      }
      if (tokens.refresh) {
        localStorage.setItem('urbanvault_refresh_token', tokens.refresh)
      }
      localStorage.setItem('urbanvault_active_username', username)

      setUser(newUser)
      return newUser
    } catch (err) {
      console.error('Failed to switch persona:', err)
      setError('Failed to switch persona. Please try again.')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    const initAuth = async () => {
      setLoading(true)
      const personaList = await loadPersonas()

      const savedToken = localStorage.getItem('urbanvault_access_token')
      const savedUsername = localStorage.getItem('urbanvault_active_username')

      if (savedToken) {
        try {
          const res = await client.get('/auth/me/')
          setUser(res.data)
        } catch {
          // If token expired, fall back to default persona
          const defaultUser = savedUsername || (personaList[0] && personaList[0].username) || 'client_chaitanya'
          if (defaultUser) {
            await switchPersona(defaultUser)
          }
        }
      } else {
        // Auto-select first seeded persona (Chaitanya M - Client POC)
        const defaultUser = (personaList[0] && personaList[0].username) || 'client_chaitanya'
        if (defaultUser) {
          await switchPersona(defaultUser)
        }
      }
      setLoading(false)
    }

    initAuth()
  }, [loadPersonas, switchPersona])

  return (
    <AuthContext.Provider
      value={{
        user,
        personas,
        loading,
        error,
        switchPersona,
        refreshUser: async () => {
          try {
            const res = await client.get('/auth/me/')
            setUser(res.data)
          } catch (e) {
            console.error('Error refreshing user:', e)
          }
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
