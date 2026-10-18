import React from 'react'
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Avatar,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  useTheme,
} from '@mui/material'
import BusinessIcon from '@mui/icons-material/Business'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import { useAuth } from '../context/AuthContext'

export const Navbar = () => {
  const theme = useTheme()
  const { user, personas, switchPersona, loading } = useAuth()

  const handlePersonaChange = (event) => {
    const selectedUsername = event.target.value
    if (selectedUsername && selectedUsername !== user?.username) {
      switchPersona(selectedUsername)
    }
  }

  const getRoleColor = (role) => {
    switch (role) {
      case 'CLIENT_POC':
        return { bg: '#E0F2FE', text: '#0369A1' } // Sky
      case 'FACILITY_MANAGER':
        return { bg: '#FEF3C7', text: '#B45309' } // Amber
      case 'DEPARTMENT_POC':
        return { bg: '#F3E8FF', text: '#7E22CE' } // Purple
      case 'TECHNICIAN':
        return { bg: '#DCFCE7', text: '#15803D' } // Emerald
      default:
        return { bg: '#F1F5F9', text: '#475569' }
    }
  }

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        backgroundColor: '#FFFFFF',
        borderBottom: `1px solid ${theme.palette.divider}`,
        color: theme.palette.text.primary,
        zIndex: theme.zIndex.drawer + 1,
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 2, md: 4 } }}>
        {/* Brand / Logo */}
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: 2,
              backgroundColor: '#0F172A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
            }}
          >
            <BusinessIcon fontSize="small" />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.02em' }}>
              UrbanVault
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
              Facility Management & Ticketing Desk
            </Typography>
          </Box>
        </Stack>

        {/* Persona Switcher Section */}
        <Stack direction="row" alignItems="center" spacing={2}>
          <FormControl size="small" sx={{ minWidth: 260 }}>
            <InputLabel id="persona-switch-label" sx={{ fontSize: '0.85rem' }}>
              Switch Persona (Role Switcher)
            </InputLabel>
            <Select
              labelId="persona-switch-label"
              value={user?.username || ''}
              onChange={handlePersonaChange}
              label="Switch Persona (Role Switcher)"
              disabled={loading}
              sx={{
                borderRadius: 2,
                backgroundColor: '#F8FAFC',
                fontSize: '0.875rem',
                fontWeight: 600,
                '& .MuiSelect-select': {
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  py: 1,
                },
              }}
            >
              {personas.map((p) => {
                const roleColors = getRoleColor(p.role)
                return (
                  <MenuItem key={p.id} value={p.username} sx={{ py: 1 }}>
                    <Stack direction="row" alignItems="center" spacing={1.5} sx={{ width: '100%' }}>
                      <Avatar
                        sx={{
                          width: 28,
                          height: 28,
                          fontSize: '0.75rem',
                          bgcolor: '#1E293B',
                          fontWeight: 700,
                        }}
                      >
                        {p.avatar_initials}
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {p.display_name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {p.title || p.role_display} {p.client_name ? `• ${p.client_name}` : p.department_name ? `• ${p.department_name}` : ''}
                        </Typography>
                      </Box>
                      <Chip
                        label={p.role.replace('_', ' ')}
                        size="small"
                        sx={{
                          fontSize: '0.65rem',
                          height: 20,
                          bgcolor: roleColors.bg,
                          color: roleColors.text,
                          fontWeight: 700,
                        }}
                      />
                    </Stack>
                  </MenuItem>
                )
              })}
            </Select>
          </FormControl>

          {/* Active User Badge */}
          {user && (
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{
                p: 0.75,
                pr: 1.5,
                borderRadius: 2,
                bgcolor: '#F1F5F9',
                display: { xs: 'none', sm: 'flex' },
              }}
            >
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  bgcolor: '#0F172A',
                }}
              >
                {user.avatar_initials}
              </Avatar>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                  {user.display_name}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                  {user.title || user.role_display}
                </Typography>
              </Box>
            </Stack>
          )}
        </Stack>
      </Toolbar>
    </AppBar>
  )
}
