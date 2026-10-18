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
  Stack,
  IconButton,
  Tooltip,
  Button,
  useTheme,
} from '@mui/material'
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined'
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined'
import TourOutlinedIcon from '@mui/icons-material/TourOutlined'
import UrbanVaultLogo from './UrbanVaultLogo'
import { useAuth } from '../context/AuthContext'
import { useColorMode } from '../context/ColorModeContext'
import { startProductTour } from '../utils/tour'

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
      <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 1.5, sm: 2, md: 3 }, minHeight: { xs: 58, sm: 64 } }}>
        {/* Brand / Logo */}
        <Stack direction="row" alignItems="center" spacing={{ xs: 1, sm: 1.5 }}>
          <Box
            sx={{
              width: { xs: 34, sm: 40 },
              height: { xs: 34, sm: 40 },
              borderRadius: 2,
              backgroundColor: isDark ? '#1E293B' : '#0F172A',
              border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isDark ? '#38BDF8' : '#FFFFFF',
              boxShadow: isDark ? '0 0 16px rgba(56, 189, 248, 0.25)' : '0 2px 8px rgba(15, 23, 42, 0.15)',
              px: 0.75,
              transition: 'all 0.2s ease',
            }}
          >
            <UrbanVaultLogo size={24} color={isDark ? '#38BDF8' : '#FFFFFF'} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.02em', fontSize: { xs: '1rem', sm: '1.1rem' } }}>
              UrbanVault
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500, display: { xs: 'none', sm: 'block' } }}>
              Facility Desk & Operations
            </Typography>
          </Box>
        </Stack>

        {/* Right Section: 1. Start Tour (left), 2. Persona Switcher (middle), 3. Theme Toggle (right) */}
        <Stack direction="row" alignItems="center" spacing={{ xs: 1, sm: 1.5 }}>
          {/* 1. Start Tour Button (Extreme Left of actions) */}
          <Button
            id="tour-nav-btn"
            variant="outlined"
            size="small"
            startIcon={<TourOutlinedIcon sx={{ fontSize: '1.1rem !important', mr: { xs: -0.5, sm: 0 } }} />}
            onClick={() => {
              startProductTour({
                isDark,
                onSelectFirstTicket: () => {
                  if (!document.querySelector('#tour-ticket-detail') && document.querySelector('#tour-ticket-list .MuiCard-root')) {
                    document.querySelector('#tour-ticket-list .MuiCard-root')?.click()
                  }
                },
              })
            }}
            sx={{
              borderRadius: 2.5,
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '0.825rem',
              height: { xs: 38, sm: 42 },
              minHeight: { xs: 38, sm: 42 },
              maxHeight: { xs: 38, sm: 42 },
              px: { xs: 1, sm: 1.75 },
              minWidth: { xs: 'auto', sm: 105 },
              borderColor: isDark ? 'rgba(56, 189, 248, 0.4)' : '#0284C7',
              color: isDark ? '#38BDF8' : '#0369A1',
              bgcolor: isDark ? 'rgba(56, 189, 248, 0.08)' : '#F0F9FF',
              '&:hover': {
                bgcolor: isDark ? 'rgba(56, 189, 248, 0.16)' : '#E0F2FE',
                borderColor: isDark ? '#38BDF8' : '#0284C7',
              },
              whiteSpace: 'nowrap',
              boxShadow: isDark ? '0 0 10px rgba(56, 189, 248, 0.15)' : 'none',
              display: 'inline-flex',
              alignItems: 'center',
              boxSizing: 'border-box',
            }}
          >
            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
              Start Tour
            </Box>
          </Button>

          {/* 2. Persona Switcher Dropdown (Afterwards / Middle) */}
          <FormControl id="tour-persona-switcher" size="small" sx={{ m: 0 }}>
            <Select
              value={user?.username || ''}
              onChange={handlePersonaChange}
              disabled={loading}
              displayEmpty
              sx={{
                height: { xs: 38, sm: 42 },
                minHeight: { xs: 38, sm: 42 },
                maxHeight: { xs: 38, sm: 42 },
                maxWidth: { xs: 145, sm: 220, md: 'none' },
                borderRadius: 2.5,
                bgcolor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F8FAFC',
                border: `1px solid ${theme.palette.divider}`,
                transition: 'all 0.2s ease',
                '&:hover': {
                  bgcolor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#F1F5F9',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : '#94A3B8',
                },
                '& .MuiOutlinedInput-notchedOutline': {
                  border: 'none',
                },
                '& .MuiSelect-select': {
                  display: 'flex !important',
                  alignItems: 'center !important',
                  height: { xs: '38px !important', sm: '42px !important' },
                  padding: { xs: '0 26px 0 8px !important', sm: '0 34px 0 10px !important' },
                  boxSizing: 'border-box !important',
                },
                '& .MuiSelect-icon': {
                  top: 'calc(50% - 12px)',
                  right: { xs: 4, sm: 8 },
                },
              }}
              renderValue={(selected) => {
                const active = personas.find((p) => p.username === selected) || user
                if (!active) return 'Select Persona'
                const badge = getRoleBadge(active.role)
                return (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: { xs: 0.8, sm: 1.2 },
                      height: '100%',
                      width: '100%',
                    }}
                  >
                    <Avatar
                      sx={{
                        width: { xs: 26, sm: 28 },
                        height: { xs: 26, sm: 28 },
                        fontSize: { xs: '0.7rem', sm: '0.75rem' },
                        bgcolor: isDark ? '#3B82F6' : '#0F172A',
                        color: '#FFFFFF',
                        fontWeight: 700,
                        flexShrink: 0,
                        alignSelf: 'center',
                        my: 'auto',
                      }}
                    >
                      {active.avatar_initials}
                    </Avatar>
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        textAlign: 'left',
                        minWidth: 0,
                        pr: 0.5,
                        my: 'auto',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, lineHeight: 1 }}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 700,
                            fontSize: { xs: '0.78rem', sm: '0.825rem' },
                            lineHeight: 1.2,
                            color: 'text.primary',
                            noWrap: true,
                            maxWidth: { xs: 75, sm: 120, md: 'none' },
                            textOverflow: 'ellipsis',
                            overflow: 'hidden',
                          }}
                        >
                          {active.display_name}
                        </Typography>
                        <Chip
                          label={badge.label}
                          size="small"
                          sx={{
                            display: { xs: 'none', sm: 'inline-flex' },
                            fontSize: '0.625rem',
                            height: 18,
                            bgcolor: badge.bg,
                            color: badge.text,
                            fontWeight: 700,
                            borderRadius: '5px',
                            '& .MuiChip-label': { px: 0.6, py: 0 },
                          }}
                        />
                      </Box>
                      <Typography
                        variant="caption"
                        sx={{
                          color: 'text.secondary',
                          fontSize: '0.68rem',
                          lineHeight: 1.2,
                          display: { xs: 'none', md: 'block' },
                          noWrap: true,
                          mt: 0.2,
                        }}
                      >
                        {active.title} {active.client_name ? `• ${active.client_name}` : active.department_name ? `• ${active.department_name}` : ''}
                      </Typography>
                    </Box>
                  </Box>
                )
              }}
            >
              {personas.map((p) => {
                const badge = getRoleBadge(p.role)
                return (
                  <MenuItem key={p.id} value={p.username} sx={{ py: 1, px: 2 }}>
                    <Stack direction="row" alignItems="center" spacing={1.2} sx={{ width: '100%' }}>
                      <Avatar
                        sx={{
                          width: 28,
                          height: 28,
                          fontSize: '0.75rem',
                          bgcolor: isDark ? '#3B82F6' : '#0F172A',
                          color: '#FFFFFF',
                          fontWeight: 700,
                        }}
                      >
                        {p.avatar_initials}
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, noWrap: true, fontSize: '0.85rem' }}>
                            {p.display_name}
                          </Typography>
                          <Chip
                            label={badge.label}
                            size="small"
                            sx={{
                              fontSize: '0.65rem',
                              height: 18,
                              bgcolor: badge.bg,
                              color: badge.text,
                              fontWeight: 700,
                              borderRadius: '5px',
                              '& .MuiChip-label': { px: 0.6, py: 0 },
                            }}
                          />
                        </Box>
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', noWrap: true, fontSize: '0.725rem', mt: 0.2 }}>
                          {p.title} {p.client_name ? `• ${p.client_name}` : p.department_name ? `• ${p.department_name}` : ''}
                        </Typography>
                      </Box>
                    </Stack>
                  </MenuItem>
                )
              })}
            </Select>
          </FormControl>

          {/* 3. Dark / Light Mode Toggle Button (Later / Right) */}
          <Tooltip title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
            <IconButton
              onClick={toggleColorMode}
              size="small"
              sx={{
                width: { xs: 38, sm: 42 },
                height: { xs: 38, sm: 42 },
                borderRadius: 2.5,
                border: `1px solid ${theme.palette.divider}`,
                bgcolor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F8FAFC',
                color: isDark ? '#FBBF24' : '#475569',
                '&:hover': {
                  bgcolor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#E2E8F0',
                },
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxSizing: 'border-box',
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
