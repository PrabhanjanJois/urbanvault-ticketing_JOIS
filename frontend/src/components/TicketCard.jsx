import React from 'react'
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Stack,
  useTheme,
} from '@mui/material'
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined'
import { useColorMode } from '../context/ColorModeContext'

export const getStatusBadgeConfig = (status, isDark = false) => {
  switch (status) {
    case 'PENDING_TECHNICIAN_ASSIGNMENT':
      return {
        label: 'Pending Technician Assignment',
        bg: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7',
        text: isDark ? '#FBBF24' : '#B45309',
        border: isDark ? 'rgba(245, 158, 11, 0.35)' : '#FDE68A',
      }
    case 'PENDING_TECHNICIAN_ASSESSMENT':
      return {
        label: 'Pending Technician Assessment',
        bg: isDark ? 'rgba(99, 102, 241, 0.15)' : '#E0E7FF',
        text: isDark ? '#A5B4FC' : '#3730A3',
        border: isDark ? 'rgba(99, 102, 241, 0.35)' : '#C7D2FE',
      }
    case 'PENDING_DEPARTMENT_REVIEW':
      return {
        label: 'Pending Department POC Review',
        bg: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2',
        text: isDark ? '#FCA5A5' : '#991B1B',
        border: isDark ? 'rgba(239, 68, 68, 0.35)' : '#FECACA',
      }
    case 'RESOLVED':
      return {
        label: 'Resolved',
        bg: isDark ? 'rgba(16, 185, 129, 0.15)' : '#D1FAE5',
        text: isDark ? '#6EE7B7' : '#065F46',
        border: isDark ? 'rgba(16, 185, 129, 0.35)' : '#A7F3D0',
      }
    case 'CLOSED':
      return {
        label: 'Closed',
        bg: isDark ? 'rgba(148, 163, 184, 0.12)' : '#F1F5F9',
        text: isDark ? '#94A3B8' : '#475569',
        border: isDark ? 'rgba(148, 163, 184, 0.25)' : '#E2E8F0',
      }
    default:
      return {
        label: status,
        bg: isDark ? 'rgba(148, 163, 184, 0.12)' : '#F1F5F9',
        text: isDark ? '#94A3B8' : '#475569',
        border: isDark ? 'rgba(148, 163, 184, 0.25)' : '#E2E8F0',
      }
  }
}

export const TicketCard = ({ ticket, onView, isSelected = false }) => {
  const theme = useTheme()
  const { mode } = useColorMode()
  const isDark = mode === 'dark'

  const statusCfg = getStatusBadgeConfig(ticket.status, isDark)
  const floorsStr = Array.isArray(ticket.floors) ? ticket.floors.join(', ') : ticket.floors
  const locationStr = `${ticket.property_name || 'Property'}; ${floorsStr}`

  return (
    <Card
      onClick={() => onView(ticket)}
      sx={{
        mb: 2,
        cursor: 'pointer',
        backgroundColor: isSelected
          ? isDark
            ? 'rgba(59, 130, 246, 0.08)'
            : 'rgba(37, 99, 235, 0.04)'
          : theme.palette.background.paper,
        borderRadius: 2.5,
        border: isSelected
          ? `2px solid ${isDark ? '#3B82F6' : '#2563EB'}`
          : `1px solid ${theme.palette.divider}`,
        transition: 'all 0.18s ease-in-out',
        '&:hover': {
          borderColor: isDark ? '#60A5FA' : '#94A3B8',
          boxShadow: isDark
            ? '0 6px 20px rgba(0, 0, 0, 0.4)'
            : '0 4px 14px rgba(15, 23, 42, 0.07)',
          transform: 'translateY(-1px)',
        },
      }}
    >
      <CardContent sx={{ p: { xs: 2, sm: 2.25 }, '&:last-child': { pb: 2 } }}>
        <Stack spacing={1.2}>
          {/* Top Line: Title + Chips */}
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 700,
                  fontSize: '0.975rem',
                  color: 'text.primary',
                  lineHeight: 1.3,
                  mb: 0.5,
                }}
              >
                {ticket.title}
              </Typography>

              <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                <Chip
                  icon={<PlaceOutlinedIcon sx={{ fontSize: '0.85rem !important' }} />}
                  label={locationStr}
                  size="small"
                  sx={{
                    bgcolor: isDark ? '#1E293B' : '#F1F5F9',
                    color: isDark ? '#E2E8F0' : '#334155',
                    fontWeight: 600,
                    fontSize: '0.725rem',
                    height: 22,
                  }}
                />

                <Chip
                  label={`#${ticket.ticket_number}`}
                  size="small"
                  variant="outlined"
                  sx={{
                    fontWeight: 700,
                    fontSize: '0.7rem',
                    color: 'text.secondary',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : '#CBD5E1',
                    height: 22,
                  }}
                />
              </Stack>
            </Box>

            {/* Status Chip */}
            <Chip
              label={statusCfg.label}
              size="small"
              sx={{
                bgcolor: statusCfg.bg,
                color: statusCfg.text,
                border: `1px solid ${statusCfg.border}`,
                fontWeight: 700,
                fontSize: '0.7rem',
                height: 22,
                flexShrink: 0,
              }}
            />
          </Stack>

          {/* Metadata Line */}
          <Stack
            direction="row"
            alignItems="center"
            spacing={1.5}
            flexWrap="wrap"
            sx={{ color: 'text.secondary', fontSize: '0.775rem' }}
          >
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <AccessTimeIcon sx={{ fontSize: 14 }} />
              <span>Created {ticket.created_at}</span>
            </Stack>

            <span>•</span>

            <Stack direction="row" alignItems="center" spacing={0.5}>
              <PersonOutlinedIcon sx={{ fontSize: 14 }} />
              <span>
                <strong>{ticket.created_by_name}</strong> ({ticket.created_by_title || 'Client POC'})
              </span>
            </Stack>
          </Stack>

          {/* Current Assignee Line matching wireframe */}
          <Box
            sx={{
              pt: 1,
              borderTop: `1px dashed ${isDark ? 'rgba(255, 255, 255, 0.08)' : '#F1F5F9'}`,
            }}
          >
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.8rem', display: 'block' }}>
              Current Assignee(s):{' '}
              <strong style={{ color: isDark ? '#F1F5F9' : '#0F172A' }}>
                {ticket.assigned_to_name
                  ? `${ticket.assigned_to_name} (${ticket.assigned_to_title || 'Assigned'})`
                  : 'Unassigned'}
              </strong>
              {ticket.department_name && (
                <span style={{ opacity: 0.8, marginLeft: 6 }}>
                  [{ticket.department_name}]
                </span>
              )}
            </Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  )
}
