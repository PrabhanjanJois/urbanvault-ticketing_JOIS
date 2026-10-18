import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Button,
  Chip,
  Stack,
  Divider,
  TextField,
  Avatar,
  Tab,
  Tabs,
  Alert,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Radio,
  RadioGroup,
  FormControlLabel,
  CircularProgress,
  Paper,
  useTheme,
} from '@mui/material'
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined'
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import SendIcon from '@mui/icons-material/Send'
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd'
import SwapCallsIcon from '@mui/icons-material/SwapCalls'
import BuildIcon from '@mui/icons-material/Build'
import { getStatusBadgeConfig } from './TicketCard'
import { useAuth } from '../context/AuthContext'
import { useColorMode } from '../context/ColorModeContext'
import client from '../api/client'

export const TicketDetailPane = ({ ticketId, onTicketUpdated }) => {
  const theme = useTheme()
  const { user } = useAuth()
  const { mode } = useColorMode()
  const isDark = mode === 'dark'

  const [ticket, setTicket] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionSuccess, setActionSuccess] = useState(null)

  // Tabs for activity
  const [activityTab, setActivityTab] = useState('all')

  // Sticky comment text
  const [commentText, setCommentText] = useState('')
  const [commentSubmitting, setCommentSubmitting] = useState(false)

  // CTAs state
  const [activeActionPanel, setActiveActionPanel] = useState(null) // 'ASSIGN_WORKER' | 'CHANGE_DEPT' | 'ASSESSMENT' | null
  const [actionLoading, setActionLoading] = useState(false)

  // Form states for CTAs
  const [auxData, setAuxData] = useState({ departments: [], technicians: [] })
  const [selectedWorkerId, setSelectedWorkerId] = useState('')
  const [selectedDeptId, setSelectedDeptId] = useState('')
  const [forwardingNote, setForwardingNote] = useState('')
  const [assessmentType, setAssessmentType] = useState('FULLY_RESOLVED')
  const [assessmentNotes, setAssessmentNotes] = useState('')

  const fetchTicketDetails = async (id) => {
    try {
      setLoading(true)
      const res = await client.get(`/ticketing/tickets/${id}/`)
      setTicket(res.data)
      setError(null)
    } catch (err) {
      console.error('Failed to load ticket details:', err)
      setError(err.response?.data?.detail || 'Could not load ticket details.')
    } finally {
      setLoading(false)
    }
  }

  const fetchAuxData = async () => {
    try {
      const res = await client.get('/ticketing/auxiliary-data/')
      setAuxData(res.data)
    } catch (e) {
      console.error('Aux data error:', e)
    }
  }

  useEffect(() => {
    if (ticketId) {
      fetchTicketDetails(ticketId)
      fetchAuxData()
      setActiveActionPanel(null)
      setActionSuccess(null)
      setError(null)
    } else {
      setTicket(null)
      setLoading(false)
    }
  }, [ticketId])

  // Handle posting a comment
  const handlePostComment = async () => {
    if (!commentText.trim()) return
    setCommentSubmitting(true)
    try {
      await client.post(`/ticketing/tickets/${ticket.id}/comments/`, {
        content: commentText.trim(),
      })
      setCommentText('')
      await fetchTicketDetails(ticket.id)
      if (onTicketUpdated) onTicketUpdated()
    } catch (err) {
      console.error('Failed to post comment:', err)
      setError('Could not post comment.')
    } finally {
      setCommentSubmitting(false)
    }
  }

  // Handle Mark Resolved directly
  const handleMarkResolved = async () => {
    setActionLoading(true)
    setError(null)
    try {
      const res = await client.post(`/ticketing/tickets/${ticket.id}/mark-resolved/`)
      setTicket(res.data)
      setActionSuccess('Ticket has been successfully marked as resolved!')
      setActiveActionPanel(null)
      if (onTicketUpdated) onTicketUpdated()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to mark ticket resolved.')
    } finally {
      setActionLoading(false)
    }
  }

  // Handle Worker Assignment
  const handleAssignWorkerSubmit = async () => {
    if (!selectedWorkerId) {
      setError('Please select a technician to assign.')
      return
    }
    setActionLoading(true)
    setError(null)
    try {
      const res = await client.post(`/ticketing/tickets/${ticket.id}/assign-worker/`, {
        worker_id: parseInt(selectedWorkerId, 10),
      })
      setTicket(res.data)
      setActionSuccess('Technician assigned successfully!')
      setActiveActionPanel(null)
      if (onTicketUpdated) onTicketUpdated()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to assign worker.')
    } finally {
      setActionLoading(false)
    }
  }

  // Handle Change Department
  const handleChangeDeptSubmit = async () => {
    if (!selectedDeptId || !forwardingNote.trim()) {
      setError('Please select a department and provide a forwarding note.')
      return
    }
    setActionLoading(true)
    setError(null)
    try {
      const res = await client.post(`/ticketing/tickets/${ticket.id}/change-department/`, {
        department_id: parseInt(selectedDeptId, 10),
        forwarding_note: forwardingNote.trim(),
      })
      setTicket(res.data)
      setActionSuccess('Department changed and forwarded successfully!')
      setActiveActionPanel(null)
      if (onTicketUpdated) onTicketUpdated()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to transfer department.')
    } finally {
      setActionLoading(false)
    }
  }

  // Handle Assessment Submit
  const handleAssessmentSubmit = async () => {
    setActionLoading(true)
    setError(null)
    try {
      const res = await client.post(`/ticketing/tickets/${ticket.id}/submit-assessment/`, {
        assessment_type: assessmentType,
        notes: assessmentNotes.trim(),
      })
      setTicket(res.data)
      setActionSuccess('Assessment submitted successfully!')
      setActiveActionPanel(null)
      if (onTicketUpdated) onTicketUpdated()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit assessment.')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 6,
          textAlign: 'center',
          borderRadius: 3,
          border: `1px solid ${theme.palette.divider}`,
          bgcolor: theme.palette.background.paper,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress size={36} sx={{ mb: 2 }} />
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Loading ticket details...
        </Typography>
      </Paper>
    )
  }

  if (!ticket) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 6,
          textAlign: 'center',
          borderRadius: 3,
          border: `1px dashed ${theme.palette.divider}`,
          bgcolor: theme.palette.background.paper,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography variant="h6" sx={{ color: 'text.secondary', fontWeight: 600, mb: 1 }}>
          No Ticket Selected
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 360 }}>
          Select a ticket from the left panel to inspect wireframe handling details, take action, or post comments.
        </Typography>
      </Paper>
    )
  }

  const statusCfg = getStatusBadgeConfig(ticket.status, isDark)
  const floorsStr = Array.isArray(ticket.floors) ? ticket.floors.join(', ') : ticket.floors || ''
  const locationStr = `${ticket.property_name || 'Property'}; ${floorsStr}`

  // Filter activities for tabs
  const filteredActivities = ticket?.activities
    ? activityTab === 'comments'
      ? ticket.activities.filter((a) => a.action_type === 'COMMENT_ADDED')
      : ticket.activities
    : []

  // Role permissions
  const isClient = user?.role === 'CLIENT_POC'
  const isFM = user?.role === 'FACILITY_MANAGER'
  const isDeptPOC = user?.role === 'DEPARTMENT_POC'
  const isTech = user?.role === 'TECHNICIAN'

  const canMarkResolved = ticket?.available_actions?.includes('MARK_RESOLVED')
  const canAssignWorker = ticket?.available_actions?.includes('ASSIGN_WORKER')
  const canChangeDept = ticket?.available_actions?.includes('CHANGE_DEPARTMENT')
  const canSubmitAssessment = ticket?.available_actions?.includes('SUBMIT_ASSESSMENT')

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 3,
        border: `1px solid ${theme.palette.divider}`,
        bgcolor: theme.palette.background.paper,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        height: '100%',
      }}
    >
      {/* 1. Header (Sticky in Wireframe) */}
      <Box
        sx={{
          p: 2.5,
          borderBottom: `1px solid ${theme.palette.divider}`,
          bgcolor: isDark ? 'rgba(255, 255, 255, 0.02)' : '#FFFFFF',
        }}
      >
        <Stack spacing={1.5}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1.5}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.5, fontSize: '1.25rem' }}>
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
                    fontSize: '0.75rem',
                    height: 24,
                  }}
                />
                <Chip
                  label={`#${ticket.ticket_number}`}
                  size="small"
                  variant="outlined"
                  sx={{
                    fontWeight: 700,
                    fontSize: '0.725rem',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : '#CBD5E1',
                    color: 'text.secondary',
                    height: 24,
                  }}
                />
              </Stack>
            </Box>

            <Chip
              label={statusCfg.label}
              size="small"
              sx={{
                bgcolor: statusCfg.bg,
                color: statusCfg.text,
                border: `1px solid ${statusCfg.border}`,
                fontWeight: 700,
                fontSize: '0.75rem',
                height: 24,
                flexShrink: 0,
              }}
            />
          </Stack>

          {/* Wireframe Metadata line */}
          <Stack
            direction="row"
            spacing={2}
            flexWrap="wrap"
            sx={{ pt: 1, borderTop: `1px solid ${theme.palette.divider}`, color: 'text.secondary', fontSize: '0.8rem' }}
          >
            <div>
              <span>Created </span>
              <strong style={{ color: isDark ? '#F1F5F9' : '#0F172A' }}>{ticket.created_at}</strong>{' '}
              <span>by </span>
              <strong style={{ color: isDark ? '#F1F5F9' : '#0F172A' }}>{ticket.created_by_name}</strong>{' '}
              <span>({ticket.created_by_title || 'Client POC'})</span>
            </div>
            <div>
              <span>Current Assignee(s): </span>
              <strong style={{ color: isDark ? '#F1F5F9' : '#0F172A' }}>
                {ticket.assigned_to_name
                  ? `${ticket.assigned_to_name} (${ticket.assigned_to_title || 'Assigned'})`
                  : 'Unassigned'}
              </strong>
            </div>
          </Stack>
        </Stack>
      </Box>

      {/* 2. Scrollable Body */}
      <Box sx={{ p: 2.5, flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {/* Feedback Alerts */}
        {actionSuccess && (
          <Alert severity="success" onClose={() => setActionSuccess(null)}>
            {actionSuccess}
          </Alert>
        )}
        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* 2A. Sticky Action Required Section (Persona Driven) */}
        <Box
          sx={{
            p: 2,
            borderRadius: 2.5,
            border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #CBD5E1',
            bgcolor: isDark ? '#1E293B' : '#FFFFFF',
            boxShadow: isDark ? '0 4px 14px rgba(0, 0, 0, 0.3)' : '0 2px 8px rgba(15, 23, 42, 0.04)',
          }}
        >
          {/* CLIENT POC CTA BANNER */}
          {isClient && (
            <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between" spacing={2}>
              <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 600, fontSize: '0.85rem' }}>
                {ticket.status === 'RESOLVED'
                  ? 'Ticket has been resolved.'
                  : 'Ticket created successfully. If the issue is resolved, you can mark it as resolved.'}
              </Typography>
              {canMarkResolved && (
                <Button
                  variant="contained"
                  color="success"
                  size="small"
                  startIcon={<CheckCircleOutlinedIcon sx={{ fontSize: 16 }} />}
                  onClick={handleMarkResolved}
                  disabled={actionLoading}
                  sx={{
                    fontWeight: 600,
                    fontSize: '0.8125rem',
                    height: 34,
                    px: 2,
                    textTransform: 'none',
                    borderRadius: 2,
                    flexShrink: 0,
                  }}
                >
                  Mark Resolved
                </Button>
              )}
            </Stack>
          )}

          {/* FACILITY MANAGER BANNER */}
          {isFM && (
            <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic', fontSize: '0.85rem' }}>
              The Concerned Facility Manager (no CTA) - Monitoring ticket across managed property: {ticket.property_name}
            </Typography>
          )}

          {/* DEPARTMENT POC CTA BANNER */}
          {isDeptPOC && (
            <Stack spacing={2}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                alignItems={{ xs: 'flex-start', sm: 'center' }}
                justifyContent="space-between"
                spacing={2}
              >
                <Stack direction="row" alignItems="center" spacing={1.2} flexWrap="wrap">
                  <Chip
                    label="Action Required"
                    size="small"
                    sx={{
                      height: 22,
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      bgcolor: isDark ? 'rgba(245, 158, 11, 0.2)' : '#FEF3C7',
                      color: isDark ? '#FBBF24' : '#B45309',
                      border: isDark ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid #FDE68A',
                    }}
                  />
                  <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 600, fontSize: '0.85rem' }}>
                    A new ticket has been assigned to you. Review it and take the next action.
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={1} flexShrink={0} flexWrap="wrap">
                  {canAssignWorker && (
                    <Button
                      variant={activeActionPanel === 'ASSIGN_WORKER' ? 'contained' : 'outlined'}
                      size="small"
                      startIcon={<AssignmentIndIcon sx={{ fontSize: 16 }} />}
                      onClick={() =>
                        setActiveActionPanel(activeActionPanel === 'ASSIGN_WORKER' ? null : 'ASSIGN_WORKER')
                      }
                      sx={{
                        fontWeight: 600,
                        fontSize: '0.8125rem',
                        height: 34,
                        textTransform: 'none',
                        borderRadius: 2,
                      }}
                    >
                      Assign Worker
                    </Button>
                  )}
                  {canChangeDept && (
                    <Button
                      variant={activeActionPanel === 'CHANGE_DEPT' ? 'contained' : 'outlined'}
                      color="secondary"
                      size="small"
                      startIcon={<SwapCallsIcon sx={{ fontSize: 16 }} />}
                      onClick={() =>
                        setActiveActionPanel(activeActionPanel === 'CHANGE_DEPT' ? null : 'CHANGE_DEPT')
                      }
                      sx={{
                        fontWeight: 600,
                        fontSize: '0.8125rem',
                        height: 34,
                        textTransform: 'none',
                        borderRadius: 2,
                      }}
                    >
                      Change Department
                    </Button>
                  )}
                  {canMarkResolved && (
                    <Button
                      variant="contained"
                      color="success"
                      size="small"
                      startIcon={<CheckCircleOutlinedIcon sx={{ fontSize: 16 }} />}
                      onClick={handleMarkResolved}
                      disabled={actionLoading}
                      sx={{
                        fontWeight: 600,
                        fontSize: '0.8125rem',
                        height: 34,
                        textTransform: 'none',
                        borderRadius: 2,
                      }}
                    >
                      Mark Resolved
                    </Button>
                  )}
                </Stack>
              </Stack>

              {/* Expanded Assign Worker Panel */}
              {activeActionPanel === 'ASSIGN_WORKER' && (
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    bgcolor: isDark ? '#111827' : '#F8FAFC',
                    borderRadius: 2,
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#E2E8F0',
                  }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: 'text.primary' }}>
                    Assign Worker (Technician)
                  </Typography>
                  <Stack spacing={2}>
                    <FormControl size="small" fullWidth>
                      <InputLabel>Select Worker (Technician)*</InputLabel>
                      <Select
                        value={selectedWorkerId}
                        onChange={(e) => setSelectedWorkerId(e.target.value)}
                        label="Select Worker (Technician)*"
                      >
                        {auxData.technicians.map((t) => (
                          <MenuItem key={t.id} value={t.id}>
                            {t.display_name} ({t.title || 'Technician'})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <Box sx={{ p: 1.5, bgcolor: isDark ? 'rgba(59, 130, 246, 0.12)' : '#EFF6FF', borderRadius: 1.5, border: isDark ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid #BFDBFE' }}>
                      <Typography variant="caption" sx={{ color: isDark ? '#93C5FD' : '#1E40AF', display: 'block', lineHeight: 1.5 }}>
                        1. Current Assignee(s) field will be updated.<br />
                        2. An ACTIVITY will be added.<br />
                        3. The Assigned Worker will start seeing the ticket.
                      </Typography>
                    </Box>

                    <Stack direction="row" spacing={1.5} justifyContent="flex-end">
                      <Button size="small" onClick={() => setActiveActionPanel(null)}>
                        Cancel
                      </Button>
                      <Button
                        variant="contained"
                        size="small"
                        onClick={handleAssignWorkerSubmit}
                        disabled={actionLoading || !selectedWorkerId}
                        sx={{ fontWeight: 700 }}
                      >
                        {actionLoading ? 'Assigning...' : 'Ok'}
                      </Button>
                    </Stack>
                  </Stack>
                </Paper>
              )}

              {/* Expanded Change Department Panel */}
              {activeActionPanel === 'CHANGE_DEPT' && (
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    bgcolor: isDark ? '#111827' : '#F8FAFC',
                    borderRadius: 2,
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#E2E8F0',
                  }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: 'text.primary' }}>
                    Select Department & Add Forwarding Note
                  </Typography>
                  <Stack spacing={2}>
                    <FormControl size="small" fullWidth>
                      <InputLabel>Select department*</InputLabel>
                      <Select
                        value={selectedDeptId}
                        onChange={(e) => setSelectedDeptId(e.target.value)}
                        label="Select department*"
                      >
                        {auxData.departments
                          .filter((d) => d.id !== ticket.department)
                          .map((d) => (
                            <MenuItem key={d.id} value={d.id}>
                              {d.name} {d.poc_name ? `(POC: ${d.poc_name})` : ''}
                            </MenuItem>
                          ))}
                      </Select>
                    </FormControl>

                    <TextField
                      label="Add forwarding note*"
                      multiline
                      rows={2}
                      size="small"
                      fullWidth
                      value={forwardingNote}
                      onChange={(e) => setForwardingNote(e.target.value)}
                      placeholder="Explain reason for re-routing to another department..."
                    />

                    <Box sx={{ p: 1.5, bgcolor: isDark ? 'rgba(59, 130, 246, 0.12)' : '#EFF6FF', borderRadius: 1.5, border: isDark ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid #BFDBFE' }}>
                      <Typography variant="caption" sx={{ color: isDark ? '#93C5FD' : '#1E40AF', display: 'block', lineHeight: 1.5 }}>
                        1. Current Assignee(s) field will be updated.<br />
                        2. An ACTIVITY will be added.<br />
                        3. The new Department POC will start seeing the ticket.
                      </Typography>
                    </Box>

                    <Stack direction="row" spacing={1.5} justifyContent="flex-end">
                      <Button size="small" onClick={() => setActiveActionPanel(null)}>
                        Cancel
                      </Button>
                      <Button
                        variant="contained"
                        color="secondary"
                        size="small"
                        onClick={handleChangeDeptSubmit}
                        disabled={actionLoading || !selectedDeptId || !forwardingNote.trim()}
                        sx={{ fontWeight: 700 }}
                      >
                        {actionLoading ? 'Transferring...' : 'Ok'}
                      </Button>
                    </Stack>
                  </Stack>
                </Paper>
              )}
            </Stack>
          )}

          {/* TECHNICIAN CTA BANNER */}
          {isTech && (
            <Stack spacing={2}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                alignItems={{ xs: 'flex-start', sm: 'center' }}
                justifyContent="space-between"
                spacing={2}
              >
                <Stack direction="row" alignItems="center" spacing={1.2} flexWrap="wrap">
                  <Chip
                    label="Action Required"
                    size="small"
                    sx={{
                      height: 22,
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      bgcolor: isDark ? 'rgba(245, 158, 11, 0.2)' : '#FEF3C7',
                      color: isDark ? '#FBBF24' : '#B45309',
                      border: isDark ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid #FDE68A',
                    }}
                  />
                  <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 600, fontSize: '0.85rem' }}>
                    You have been assigned this ticket. Take action.
                  </Typography>
                </Stack>

                {canSubmitAssessment && (
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<BuildIcon sx={{ fontSize: 16 }} />}
                    onClick={() =>
                      setActiveActionPanel(activeActionPanel === 'ASSESSMENT' ? null : 'ASSESSMENT')
                    }
                    sx={{
                      bgcolor: isDark ? '#2563EB' : '#1D4ED8',
                      color: '#FFFFFF',
                      '&:hover': {
                        bgcolor: isDark ? '#1D4ED8' : '#1E40AF',
                      },
                      px: 2,
                      py: 0.6,
                      height: 34,
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      textTransform: 'none',
                      borderRadius: 2,
                      boxShadow: isDark
                        ? '0 2px 10px rgba(37, 99, 235, 0.35)'
                        : '0 2px 8px rgba(29, 78, 216, 0.25)',
                      flexShrink: 0,
                    }}
                  >
                    Submit Assessment
                  </Button>
                )}
              </Stack>

              {/* Expanded Submit Assessment Panel matching Wireframe Options */}
              {activeActionPanel === 'ASSESSMENT' && (
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    bgcolor: isDark ? '#111827' : '#F8FAFC',
                    borderRadius: 2,
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#E2E8F0',
                  }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>
                    Select Assessment Outcome
                  </Typography>
                  <RadioGroup
                    value={assessmentType}
                    onChange={(e) => setAssessmentType(e.target.value)}
                    sx={{ gap: 1.5, mb: 2 }}
                  >
                    <FormControlLabel
                      value="FULLY_RESOLVED"
                      control={<Radio size="small" />}
                      label={
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: isDark ? '#6EE7B7' : '#15803D' }}>
                            Mark Fully Resolved
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            The issue has been fully resolved. No further action is needed.
                          </Typography>
                        </Box>
                      }
                    />
                    <FormControlLabel
                      value="PARTIALLY_RESOLVED"
                      control={<Radio size="small" />}
                      label={
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: isDark ? '#FBBF24' : '#B45309' }}>
                            Mark Partially Resolved
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            I've resolved my part of the issue. But, it also involves another Department/Worker's scope.
                          </Typography>
                        </Box>
                      }
                    />
                    <FormControlLabel
                      value="SUGGEST_CHANGE"
                      control={<Radio size="small" />}
                      label={
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: isDark ? '#F87171' : '#B91C1C' }}>
                            Suggest Department/Worker Change
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            The issue is outside my scope. Please assign it to the correct Department/Worker.
                          </Typography>
                        </Box>
                      }
                    />
                  </RadioGroup>

                  <TextField
                    label="Assessment Notes (Optional)"
                    multiline
                    rows={2}
                    size="small"
                    fullWidth
                    value={assessmentNotes}
                    onChange={(e) => setAssessmentNotes(e.target.value)}
                    placeholder="Describe field inspection details or required follow-up..."
                    sx={{ mb: 2 }}
                  />

                  <Stack direction="row" spacing={1.5} justifyContent="flex-end">
                    <Button size="small" onClick={() => setActiveActionPanel(null)}>
                      Cancel
                    </Button>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={handleAssessmentSubmit}
                      disabled={actionLoading}
                      sx={{ fontWeight: 700 }}
                    >
                      {actionLoading ? 'Submitting...' : 'Submit'}
                    </Button>
                  </Stack>
                </Paper>
              )}
            </Stack>
          )}
        </Box>

        {/* 2B. ISSUE DESCRIPTION */}
        <Box
          sx={{
            p: 2.25,
            borderRadius: 2.5,
            border: `1px solid ${theme.palette.divider}`,
            bgcolor: isDark ? 'rgba(255, 255, 255, 0.02)' : '#F8FAFC',
          }}
        >
          <Typography
            variant="caption"
            sx={{ fontWeight: 800, color: 'text.secondary', letterSpacing: '0.05em', textTransform: 'uppercase' }}
          >
            ISSUE DESCRIPTION
          </Typography>
          <Typography
            variant="body2"
            sx={{
              mt: 1,
              color: 'text.primary',
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
            }}
          >
            {ticket.description || 'No detailed description provided.'}
          </Typography>
        </Box>

        {/* 2C. ACTIVITY Timeline */}
        <Box
          sx={{
            p: 2.25,
            borderRadius: 2.5,
            border: `1px solid ${theme.palette.divider}`,
            bgcolor: isDark ? 'rgba(255, 255, 255, 0.02)' : '#FFFFFF',
          }}
        >
          {/* Aligned Activity Header & Tabs Bar */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2.5,
              borderBottom: `1px solid ${theme.palette.divider}`,
              mb: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 800,
                  color: 'text.primary',
                  letterSpacing: '0.04em',
                  fontSize: '0.85rem',
                }}
              >
                ACTIVITY
              </Typography>
              <Chip
                label={`${ticket.activities?.length || 0} events`}
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  bgcolor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#F1F5F9',
                  color: 'text.secondary',
                }}
              />
            </Box>

            <Tabs
              value={activityTab}
              onChange={(e, val) => setActivityTab(val)}
              textColor="primary"
              indicatorColor="primary"
              sx={{
                minHeight: 40,
                '& .MuiTabs-indicator': {
                  height: 2.5,
                  borderRadius: '2px 2px 0 0',
                },
                '& .MuiTab-root': {
                  minHeight: 40,
                  py: 1,
                  px: 2,
                  fontSize: '0.825rem',
                  fontWeight: 700,
                  textTransform: 'none',
                  color: 'text.secondary',
                  '&.Mui-selected': {
                    color: isDark ? '#60A5FA' : '#0F172A',
                  },
                },
              }}
            >
              <Tab label="All Actions" value="all" />
              <Tab label="Comments" value="comments" />
            </Tabs>
          </Box>

          <Stack spacing={2}>
            {filteredActivities.length === 0 ? (
              <Typography variant="body2" sx={{ color: 'text.secondary', py: 2, textAlign: 'center' }}>
                No events recorded yet.
              </Typography>
            ) : (
              filteredActivities.map((act) => (
                <Box
                  key={act.id}
                  sx={{
                    display: 'flex',
                    gap: 1.5,
                    alignItems: 'flex-start',
                    pb: 1.5,
                    borderBottom: `1px dashed ${theme.palette.divider}`,
                  }}
                >
                  <Avatar
                    sx={{
                      width: 28,
                      height: 28,
                      fontSize: '0.725rem',
                      fontWeight: 700,
                      bgcolor: isDark ? '#3B82F6' : '#0F172A',
                      color: '#FFFFFF',
                    }}
                  >
                    {act.actor_initials}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="baseline" spacing={1}>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary', lineHeight: 1.4 }}>
                        {act.description}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary', flexShrink: 0, fontWeight: 500 }}>
                        {act.created_at}
                      </Typography>
                    </Stack>

                    {/* Metadata detail badges matching wireframe */}
                    {act.metadata && Object.keys(act.metadata).length > 0 && (
                      <Box sx={{ mt: 0.75, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {act.metadata.assigned_from && act.metadata.assigned_to && (
                          <Chip
                            label={`History: ${act.metadata.assigned_from} → ${act.metadata.assigned_to}`}
                            size="small"
                            sx={{
                              bgcolor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F1F5F9',
                              color: 'text.primary',
                              fontSize: '0.7rem',
                              height: 22,
                            }}
                          />
                        )}
                        {act.metadata.old_department && act.metadata.new_department && (
                          <Chip
                            label={`History: ${act.metadata.old_department} → ${act.metadata.new_department}`}
                            size="small"
                            sx={{
                              bgcolor: isDark ? 'rgba(168, 85, 247, 0.2)' : '#F3E8FF',
                              color: isDark ? '#C084FC' : '#7E22CE',
                              fontSize: '0.7rem',
                              height: 22,
                            }}
                          />
                        )}
                        {act.metadata.old_status && act.metadata.new_status && (
                          <Chip
                            label={`History: ${act.metadata.old_status} → ${act.metadata.new_status}`}
                            size="small"
                            sx={{
                              bgcolor: isDark ? 'rgba(245, 158, 11, 0.2)' : '#FEF3C7',
                              color: isDark ? '#FBBF24' : '#B45309',
                              fontSize: '0.7rem',
                              height: 22,
                            }}
                          />
                        )}
                        {act.metadata.forwarding_note && (
                          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontStyle: 'italic', width: '100%' }}>
                            Comment: {act.metadata.forwarding_note}
                          </Typography>
                        )}
                        {act.metadata.notes && (
                          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontStyle: 'italic', width: '100%' }}>
                            Assessment note: {act.metadata.notes}
                          </Typography>
                        )}
                      </Box>
                    )}
                  </Box>
                </Box>
              ))
            )}
          </Stack>
        </Box>
      </Box>

      {/* 3. Sticky Bottom Section (Comments) */}
      <Box
        sx={{
          p: 2,
          borderTop: `1px solid ${theme.palette.divider}`,
          bgcolor: isDark ? 'rgba(255, 255, 255, 0.02)' : '#FFFFFF',
          display: 'flex',
          gap: 1.5,
          alignItems: 'center',
        }}
      >
        <TextField
          placeholder="Write a comment..."
          size="small"
          fullWidth
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handlePostComment()
            }
          }}
          disabled={commentSubmitting}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
            },
          }}
        />
        <Button
          variant="contained"
          onClick={handlePostComment}
          disabled={commentSubmitting || !commentText.trim()}
          endIcon={<SendIcon />}
          sx={{
            px: 2.5,
            fontWeight: 700,
            bgcolor: isDark ? '#3B82F6' : '#0F172A',
            '&:hover': {
              bgcolor: isDark ? '#2563EB' : '#1E293B',
            },
          }}
        >
          Post
        </Button>
      </Box>
    </Paper>
  )
}
