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
import { getStatusBadgeConfig } from '../utils/status'

export { getStatusBadgeConfig }

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
          {/* Row 1: Title & Status Badge */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 1.5,
            }}
          >
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 700,
                fontSize: '0.95rem',
                color: 'text.primary',
                lineHeight: 1.35,
                flex: 1,
                minWidth: 0,
              }}
            >
              {ticket.title}
            </Typography>

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
          </Box>

          {/* Row 2: Location and Ticket ID Chips */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
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
          </Box>

          {/* Row 3: Metadata Line (Created Date & Author with safe wrapping) */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 1,
              color: 'text.secondary',
              fontSize: '0.775rem',
              lineHeight: 1.4,
              pt: 0.25,
            }}
          >
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, whiteSpace: 'nowrap' }}>
              <AccessTimeIcon sx={{ fontSize: 14, flexShrink: 0 }} />
              <span>Created {ticket.created_at}</span>
            </Box>

            <Box component="span" sx={{ opacity: 0.5, userSelect: 'none' }}>•</Box>

            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, whiteSpace: 'nowrap' }}>
              <PersonOutlinedIcon sx={{ fontSize: 14, flexShrink: 0 }} />
              <span>
                <strong>{ticket.created_by_name}</strong>{' '}
                <span style={{ opacity: 0.85 }}>({ticket.created_by_title || 'Client POC'})</span>
              </span>
            </Box>
          </Box>

          {/* Row 4: Current Assignee Line matching wireframe */}
          <Box
            sx={{
              pt: 1,
              borderTop: `1px dashed ${isDark ? 'rgba(255, 255, 255, 0.08)' : '#F1F5F9'}`,
            }}
          >
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                fontSize: '0.8rem',
                lineHeight: 1.4,
                display: 'block',
              }}
            >
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
