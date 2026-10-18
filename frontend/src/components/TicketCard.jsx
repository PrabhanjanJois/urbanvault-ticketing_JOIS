import React from 'react'
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Chip,
  Stack,
  Divider,
} from '@mui/material'
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined'
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos'

export const getStatusBadgeConfig = (status) => {
  switch (status) {
    case 'PENDING_TECHNICIAN_ASSIGNMENT':
      return {
        label: 'Pending Technician Assignment',
        bg: '#FEF3C7',
        text: '#B45309',
        border: '#FDE68A',
      }
    case 'PENDING_TECHNICIAN_ASSESSMENT':
      return {
        label: 'Pending Technician Assessment',
        bg: '#E0E7FF',
        text: '#3730A3',
        border: '#C7D2FE',
      }
    case 'PENDING_DEPARTMENT_REVIEW':
      return {
        label: 'Pending Department POC Review',
        bg: '#FEE2E2',
        text: '#991B1B',
        border: '#FECACA',
      }
    case 'RESOLVED':
      return {
        label: 'Resolved',
        bg: '#D1FAE5',
        text: '#065F46',
        border: '#A7F3D0',
      }
    case 'CLOSED':
      return {
        label: 'Closed',
        bg: '#F1F5F9',
        text: '#475569',
        border: '#E2E8F0',
      }
    default:
      return {
        label: status,
        bg: '#F1F5F9',
        text: '#475569',
        border: '#E2E8F0',
      }
  }
}

export const TicketCard = ({ ticket, onView }) => {
  const statusCfg = getStatusBadgeConfig(ticket.status)

  // Format floors display e.g. "Harness-1317; 2F, 3F"
  const floorsStr = Array.isArray(ticket.floors) ? ticket.floors.join(', ') : ticket.floors
  const locationStr = `${ticket.property_name || 'Property'}; ${floorsStr}`

  return (
    <Card
      sx={{
        mb: 2,
        backgroundColor: '#FFFFFF',
        borderRadius: 2.5,
        border: '1px solid #E2E8F0',
        transition: 'all 0.15s ease',
        '&:hover': {
          borderColor: '#94A3B8',
          boxShadow: '0 4px 12px rgba(15, 23, 42, 0.05)',
        },
      }}
    >
      <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', md: 'center' }}
          spacing={2}
        >
          {/* Main Info */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap" sx={{ mb: 1 }}>
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 700,
                  fontSize: '1.05rem',
                  color: '#0F172A',
                }}
              >
                {ticket.title}
              </Typography>

              <Chip
                icon={<PlaceOutlinedIcon sx={{ fontSize: '0.9rem !important' }} />}
                label={locationStr}
                size="small"
                sx={{
                  bgcolor: '#F1F5F9',
                  color: '#334155',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  borderRadius: 1.5,
                }}
              />

              <Chip
                label={`#${ticket.ticket_number}`}
                size="small"
                variant="outlined"
                sx={{
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  color: '#64748B',
                  borderColor: '#CBD5E1',
                }}
              />
            </Stack>

            {/* Metadata Line */}
            <Stack
              direction="row"
              alignItems="center"
              spacing={2}
              flexWrap="wrap"
              sx={{ color: '#64748B', fontSize: '0.85rem' }}
            >
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <AccessTimeIcon sx={{ fontSize: 16 }} />
                <span>Created {ticket.created_at}</span>
              </Stack>

              <span>•</span>

              <Stack direction="row" alignItems="center" spacing={0.5}>
                <PersonOutlinedIcon sx={{ fontSize: 16 }} />
                <span>
                  <strong>{ticket.created_by_name}</strong> ({ticket.created_by_title || 'Client POC'})
                </span>
              </Stack>
            </Stack>

            {/* Assignee line matching wireframe */}
            <Box sx={{ mt: 1, pt: 1, borderTop: '1px dashed #F1F5F9' }}>
              <Typography variant="body2" sx={{ color: '#475569', fontSize: '0.85rem' }}>
                <span style={{ color: '#64748B' }}>Current Assignee(s): </span>
                <strong style={{ color: '#0F172A' }}>
                  {ticket.assigned_to_name
                    ? `${ticket.assigned_to_name} (${ticket.assigned_to_title || 'Assigned'})`
                    : 'Unassigned'}
                </strong>
                {ticket.department_name && (
                  <span style={{ color: '#64748B', marginLeft: 8 }}>
                    [{ticket.department_name}]
                  </span>
                )}
              </Typography>
            </Box>
          </Box>

          {/* Right Action & Status Section */}
          <Stack
            direction={{ xs: 'row', md: 'column' }}
            alignItems={{ xs: 'center', md: 'flex-end' }}
            justifyContent="space-between"
            spacing={1.5}
            sx={{ width: { xs: '100%', md: 'auto' } }}
          >
            <Chip
              label={statusCfg.label}
              size="small"
              sx={{
                bgcolor: statusCfg.bg,
                color: statusCfg.text,
                border: `1px solid ${statusCfg.border}`,
                fontWeight: 700,
                fontSize: '0.75rem',
                py: 0.25,
              }}
            />

            <Button
              variant="contained"
              size="small"
              onClick={() => onView(ticket)}
              endIcon={<ArrowForwardIosIcon sx={{ fontSize: '0.75rem !important' }} />}
              sx={{
                bgcolor: '#0F172A',
                '&:hover': { bgcolor: '#1E293B' },
                px: 2.5,
                fontWeight: 700,
                borderRadius: 1.5,
              }}
            >
              View
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  )
}
