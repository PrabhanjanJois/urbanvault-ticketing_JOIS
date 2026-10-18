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
  IconButton,
  Tooltip,
  useTheme,
} from '@mui/material'
import BusinessIcon from '@mui/icons-material/Business'
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined'
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined'
import { useAuth } from '../context/AuthContext'
import { useColorMode } from '../context/ColorModeContext'

export const Navbar = () => {
  const theme = useTheme()
  const { user, personas, switchPersona, loading } = useAuth()
  const { mode, toggleColorMode } = useColorMode()
  const isDark = mode === 'dark'

  const handlePersonaChange = (event) => {
    const selectedUsername = event.target.value
    if (selectedUsername && selectedUsername !== user?.username) {
      switchPersona(selectedUsername)
    }
  }

  const getRoleBadge = (role) => {
    switch (role) {
      case 'CLIENT_POC':
        return { label: 'Client POC', bg: isDark ? 'rgba(14, 165, 233, 0.2)' : '#E0F2FE', text: isDark ? '#38BDF8' : '#0369A1' }
      case 'FACILITY_MANAGER':
        return { label: 'Facility Mgr', bg: isDark ? 'rgba(245, 158, 11, 0.2)' : '#FEF3C7', text: isDark ? '#FBBF24' : '#B45309' }
      case 'DEPARTMENT_POC':
        return { label: 'Dept POC', bg: isDark ? 'rgba(168, 85, 247, 0.2)' : '#F3E8FF', text: isDark ? '#C084FC' : '#7E22CE' }
      case 'TECHNICIAN':
        return { label: 'Technician', bg: isDark ? 'rgba(16, 185, 129, 0.2)' : '#DCFCE7', text: isDark ? '#34D399' : '#15803D' }
      default:
        return { label: role, bg: isDark ? 'rgba(148, 163, 184, 0.2)' : '#F1F5F9', text: isDark ? '#94A3B8' : '#475569' }
    }
  }

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        backgroundColor: theme.palette.background.paper,
        borderBottom: `1px solid ${theme.palette.divider}`,
        color: theme.palette.text.primary,
        backdropFilter: 'blur(12px)',
        zIndex: theme.zIndex.drawer + 1,
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 2, md: 3 }, minHeight: 64 }}>
        {/* Brand / Logo */}
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 2,
              backgroundColor: isDark ? '#3B82F6' : '#0F172A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              boxShadow: isDark ? '0 0 16px rgba(59, 130, 246, 0.4)' : 'none',
            }}
          >
            <BusinessIcon fontSize="small" />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.02em', fontSize: '1.05rem' }}>
              UrbanVault
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500, display: { xs: 'none', sm: 'block' } }}>
              Facility Desk & Operations
            </Typography>
          </Box>
        </Stack>

        {/* Right Section: Persona Switcher & Dark Mode Toggle */}
        <Stack direction="row" alignItems="center" spacing={1.5}>
          {/* Persona Switcher Dropdown */}
          <FormControl size="small" sx={{ minWidth: { xs: 180, sm: 260 } }}>
            <InputLabel id="persona-switch-label" sx={{ fontSize: '0.8rem', fontWeight: 600 }}>
              Active Persona (1-Click Switch)
            </InputLabel>
            <Select
              labelId="persona-switch-label"
              value={user?.username || ''}
              onChange={handlePersonaChange}
              label="Active Persona (1-Click Switch)"
              disabled={loading}
              sx={{
                borderRadius: 2,
                fontSize: '0.85rem',
                fontWeight: 600,
                bgcolor: isDark ? '#1E293B' : '#F8FAFC',
                '& .MuiSelect-select': {
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  py: 0.8,
                },
              }}
            >
              {personas.map((p) => {
                const badge = getRoleBadge(p.role)
                return (
                  <MenuItem key={p.id} value={p.username} sx={{ py: 1 }}>
                    <Stack direction="row" alignItems="center" spacing={1.2} sx={{ width: '100%' }}>
                      <Avatar
                        sx={{
                          width: 26,
                          height: 26,
                          fontSize: '0.7rem',
                          bgcolor: isDark ? '#3B82F6' : '#0F172A',
                          color: '#FFFFFF',
                          fontWeight: 700,
                        }}
                      >
                        {p.avatar_initials}
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, noWrap: true, fontSize: '0.825rem' }}>
                          {p.display_name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', noWrap: true, fontSize: '0.7rem' }}>
                          {p.title} {p.client_name ? `• ${p.client_name}` : p.department_name ? `• ${p.department_name}` : ''}
                        </Typography>
                      </Box>
                      <Chip
                        label={badge.label}
                        size="small"
                        sx={{
                          fontSize: '0.625rem',
                          height: 18,
                          bgcolor: badge.bg,
                          color: badge.text,
                          fontWeight: 700,
                        }}
                      />
                    </Stack>
                  </MenuItem>
                )
              })}
            </Select>
          </FormControl>

          {/* Active User Chip on desktop */}
          {user && (
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{
                p: 0.5,
                pr: 1.5,
                borderRadius: 2,
                bgcolor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#F1F5F9',
                border: `1px solid ${theme.palette.divider}`,
                display: { xs: 'none', md: 'flex' },
              }}
            >
              <Avatar
                sx={{
                  width: 28,
                  height: 28,
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  bgcolor: isDark ? '#3B82F6' : '#0F172A',
                  color: '#FFFFFF',
                }}
              >
                {user.avatar_initials}
              </Avatar>
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 700, lineHeight: 1.1, display: 'block', color: 'text.primary' }}>
                  {user.display_name}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.675rem', fontWeight: 600 }}>
                  {getRoleBadge(user.role).label}
                </Typography>
              </Box>
            </Stack>
          )}

          {/* Dark / Light Mode Toggle Button */}
          <Tooltip title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
            <IconButton
              onClick={toggleColorMode}
              size="small"
              sx={{
                p: 1,
                borderRadius: 2,
                border: `1px solid ${theme.palette.divider}`,
                bgcolor: isDark ? '#1E293B' : '#F8FAFC',
                color: isDark ? '#FBBF24' : '#475569',
                '&:hover': {
                  bgcolor: isDark ? '#334155' : '#E2E8F0',
                },
              }}
            >
              {isDark ? <LightModeOutlinedIcon fontSize="small" /> : <DarkModeOutlinedIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Stack>
      </Toolbar>
    </AppBar>
  )
}
