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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
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
import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined'
import DeleteOutlineIcon from '@mui/icons-material/Delete'
import CloseIcon from '@mui/icons-material/Close'
import { getStatusBadgeConfig } from '../utils/status'
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

  // Sticky comment text & image
  const [commentText, setCommentText] = useState('')
  const [commentFile, setCommentFile] = useState(null)
  const [commentPreview, setCommentPreview] = useState('')
  const [commentSubmitting, setCommentSubmitting] = useState(false)

  // Lightbox
  const [lightboxUrl, setLightboxUrl] = useState(null)

  // Mark Resolved dialog & completion image
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false)
  const [resolveFile, setResolveFile] = useState(null)
  const [resolvePreview, setResolvePreview] = useState('')
  const [resolveNotes, setResolveNotes] = useState('')

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
  const [assessmentFile, setAssessmentFile] = useState(null)
  const [assessmentPreview, setAssessmentPreview] = useState('')

  const uploadFile = async (file) => {
    if (!file) return ''
    const formData = new FormData()
    formData.append('file', file)
    const res = await client.post('/ticketing/upload/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data.file_url || ''
  }

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
    if (!commentText.trim() && !commentFile) return
    setCommentSubmitting(true)
    try {
      let uploadedUrl = ''
      if (commentFile) {
        uploadedUrl = await uploadFile(commentFile)
      }
      await client.post(`/ticketing/tickets/${ticket.id}/comments/`, {
        content: commentText.trim(),
        image_url: uploadedUrl,
      })
      setCommentText('')
      setCommentFile(null)
      setCommentPreview('')
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
      let uploadedUrl = ''
      if (resolveFile) {
        uploadedUrl = await uploadFile(resolveFile)
      }
      const res = await client.post(`/ticketing/tickets/${ticket.id}/mark-resolved/`, {
        image_url: uploadedUrl,
        notes: resolveNotes.trim(),
      })
      setTicket(res.data)
      setActionSuccess('Ticket has been successfully marked as resolved!')
      setActiveActionPanel(null)
      setResolveDialogOpen(false)
      setResolveFile(null)
      setResolvePreview('')
      setResolveNotes('')
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
      let uploadedUrl = ''
      if (assessmentFile) {
        uploadedUrl = await uploadFile(assessmentFile)
      }
      const res = await client.post(`/ticketing/tickets/${ticket.id}/submit-assessment/`, {
        assessment_type: assessmentType,
        notes: assessmentNotes.trim(),
        image_url: uploadedUrl,
      })
      setTicket(res.data)
      setActionSuccess('Assessment submitted successfully!')
      setActiveActionPanel(null)
      setAssessmentFile(null)
      setAssessmentPreview('')
      setAssessmentNotes('')
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
  const allActionsCount = ticket?.activities?.length || 0
  const commentsCount = ticket?.activities
    ? ticket.activities.filter((a) => a.action_type === 'COMMENT_ADDED').length
    : (ticket?.comments?.length || 0)

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
  const isResolvedOrClosed = ticket?.status === 'RESOLVED' || ticket?.status === 'CLOSED'

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
          p: { xs: 2, sm: 2.5 },
          borderBottom: `1px solid ${theme.palette.divider}`,
          bgcolor: isDark ? 'rgba(255, 255, 255, 0.02)' : '#FFFFFF',
        }}
      >
        <Stack spacing={1.5}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'flex-start' }} spacing={1.5}>
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
                {ticket.ac_unit_number && (
                  <Chip
                    label={`Asset ID: ${ticket.ac_unit_number}`}
                    size="small"
                    sx={{
                      bgcolor: isDark ? 'rgba(56, 189, 248, 0.15)' : '#E0F2FE',
                      color: isDark ? '#38BDF8' : '#0369A1',
                      fontWeight: 700,
                      fontSize: '0.725rem',
                      height: 24,
                      border: isDark ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid #BAE6FD',
                    }}
                  />
                )}
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
      <Box sx={{ p: { xs: 2, sm: 2.5 }, flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2.5 }}>
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
        {!isResolvedOrClosed && (
          <Box
            id="tour-action-banner"
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
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: { xs: 'flex-start', sm: 'center' },
                justifyContent: 'space-between',
                width: '100%',
                gap: 2,
                minHeight: 34,
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  color: 'text.primary',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  lineHeight: '24px',
                  m: 0,
                }}
              >
                Ticket created successfully. If the issue is resolved, you can mark it as resolved.
              </Typography>
              {canMarkResolved && (
                <Button
                  variant="contained"
                  color="success"
                  size="small"
                  startIcon={<CheckCircleOutlinedIcon sx={{ fontSize: '1rem !important' }} />}
                  onClick={() => setResolveDialogOpen(true)}
                  disabled={actionLoading}
                  sx={{
                    ml: { sm: 'auto' },
                    fontWeight: 600,
                    fontSize: '0.8125rem',
                    height: 32,
                    minHeight: 32,
                    px: 2,
                    textTransform: 'none',
                    borderRadius: 1.5,
                    boxShadow: 'none',
                    flexShrink: 0,
                  }}
                >
                  Mark Resolved
                </Button>
              )}
            </Box>
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
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  alignItems: { xs: 'flex-start', sm: 'center' },
                  justifyContent: 'space-between',
                  width: '100%',
                  gap: 2,
                  minHeight: 34,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                  <Chip
                    label="Action Required"
                    size="small"
                    sx={{
                      height: 24,
                      fontSize: '0.725rem',
                      fontWeight: 700,
                      bgcolor: isDark ? 'rgba(245, 158, 11, 0.2)' : '#FEF3C7',
                      color: isDark ? '#FBBF24' : '#B45309',
                      border: isDark ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid #FDE68A',
                      borderRadius: 1.5,
                      flexShrink: 0,
                    }}
                  />
                  <Typography
                    variant="body2"
                    sx={{
                      color: 'text.primary',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      lineHeight: '24px',
                      m: 0,
                    }}
                  >
                    A new ticket has been assigned to you. Review it and take the next action.
                  </Typography>
                </Box>

                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    ml: { sm: 'auto' },
                    flexShrink: 0,
                    flexWrap: 'wrap',
                  }}
                >
                  {canAssignWorker && (
                    <Button
                      variant={activeActionPanel === 'ASSIGN_WORKER' ? 'contained' : 'outlined'}
                      size="small"
                      startIcon={<AssignmentIndIcon sx={{ fontSize: '1rem !important' }} />}
                      onClick={() =>
                        setActiveActionPanel(activeActionPanel === 'ASSIGN_WORKER' ? null : 'ASSIGN_WORKER')
                      }
                      sx={{
                        fontWeight: 600,
                        fontSize: '0.8125rem',
                        height: 32,
                        minHeight: 32,
                        textTransform: 'none',
                        borderRadius: 1.5,
                        boxShadow: 'none',
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
                      startIcon={<SwapCallsIcon sx={{ fontSize: '1rem !important' }} />}
                      onClick={() =>
                        setActiveActionPanel(activeActionPanel === 'CHANGE_DEPT' ? null : 'CHANGE_DEPT')
                      }
                      sx={{
                        fontWeight: 600,
                        fontSize: '0.8125rem',
                        height: 32,
                        minHeight: 32,
                        textTransform: 'none',
                        borderRadius: 1.5,
                        boxShadow: 'none',
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
                      startIcon={<CheckCircleOutlinedIcon sx={{ fontSize: '1rem !important' }} />}
                      onClick={() => setResolveDialogOpen(true)}
                      disabled={actionLoading}
                      sx={{
                        fontWeight: 600,
                        fontSize: '0.8125rem',
                        height: 32,
                        minHeight: 32,
                        textTransform: 'none',
                        borderRadius: 1.5,
                        boxShadow: 'none',
                      }}
                    >
                      Mark Resolved
                    </Button>
                  )}
                </Box>
              </Box>

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
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  alignItems: { xs: 'flex-start', sm: 'center' },
                  justifyContent: 'space-between',
                  gap: 2,
                  minHeight: 34,
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    flexWrap: 'wrap',
                  }}
                >
                  {ticket.status === 'PENDING_TECHNICIAN_ASSIGNMENT' ? (
                    <>
                      <Chip
                        label="Pending Manager Approval"
                        size="small"
                        sx={{
                          height: 24,
                          fontSize: '0.725rem',
                          fontWeight: 700,
                          bgcolor: isDark ? 'rgba(148, 163, 184, 0.15)' : '#F1F5F9',
                          color: isDark ? '#94A3B8' : '#475569',
                          border: isDark ? '1px solid rgba(148, 163, 184, 0.3)' : '1px solid #CBD5E1',
                          borderRadius: 1.5,
                          flexShrink: 0,
                        }}
                      />
                      <Typography
                        variant="body2"
                        sx={{
                          color: 'text.secondary',
                          fontWeight: 500,
                          fontSize: '0.875rem',
                          lineHeight: '24px',
                          m: 0,
                        }}
                      >
                        Department Manager ({ticket.assigned_to_name || 'Technical Manager'}) has to approve. Once approved, action will be required.
                      </Typography>
                    </>
                  ) : ticket.status === 'PENDING_DEPARTMENT_REVIEW' ? (
                    <>
                      <Chip
                        label="Pending Review"
                        size="small"
                        sx={{
                          height: 24,
                          fontSize: '0.725rem',
                          fontWeight: 700,
                          bgcolor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2',
                          color: isDark ? '#FCA5A5' : '#991B1B',
                          border: isDark ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid #FECACA',
                          borderRadius: 1.5,
                          flexShrink: 0,
                        }}
                      />
                      <Typography
                        variant="body2"
                        sx={{
                          color: 'text.secondary',
                          fontWeight: 500,
                          fontSize: '0.875rem',
                          lineHeight: '24px',
                          m: 0,
                        }}
                      >
                        Assessment submitted. Department Manager is currently reviewing required parts / approvals.
                      </Typography>
                    </>
                  ) : canSubmitAssessment ? (
                    <>
                      <Chip
                        label="Action Required"
                        size="small"
                        sx={{
                          height: 24,
                          fontSize: '0.725rem',
                          fontWeight: 700,
                          bgcolor: isDark ? 'rgba(245, 158, 11, 0.2)' : '#FEF3C7',
                          color: isDark ? '#FBBF24' : '#B45309',
                          border: isDark ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid #FDE68A',
                          borderRadius: 1.5,
                          flexShrink: 0,
                        }}
                      />
                      <Typography
                        variant="body2"
                        sx={{
                          color: 'text.primary',
                          fontWeight: 600,
                          fontSize: '0.875rem',
                          lineHeight: '24px',
                          m: 0,
                        }}
                      >
                        You have been assigned this ticket. Take action.
                      </Typography>
                    </>
                  ) : null}
                </Box>

                {canSubmitAssessment && (
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<BuildIcon sx={{ fontSize: '1rem !important' }} />}
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
                      height: 32,
                      minHeight: 32,
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      textTransform: 'none',
                      borderRadius: 1.5,
                      boxShadow: 'none',
                      flexShrink: 0,
                      display: 'inline-flex',
                      alignItems: 'center',
                    }}
                  >
                    Submit Assessment
                  </Button>
                )}
              </Box>

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

                  {/* Assessment Photo Upload */}
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', display: 'block', mb: 0.75 }}>
                      Work / Inspection Photo (Optional)
                    </Typography>
                    {assessmentPreview ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box
                          component="img"
                          src={assessmentPreview}
                          alt="Assessment preview"
                          sx={{
                            width: 60,
                            height: 60,
                            borderRadius: 1.5,
                            objectFit: 'cover',
                            border: `1px solid ${theme.palette.divider}`,
                          }}
                        />
                        <Button
                          size="small"
                          color="error"
                          startIcon={<DeleteOutlineIcon fontSize="small" />}
                          onClick={() => {
                            setAssessmentFile(null)
                            setAssessmentPreview('')
                          }}
                          sx={{ textTransform: 'none', fontSize: '0.8rem' }}
                        >
                          Remove Photo
                        </Button>
                      </Box>
                    ) : (
                      <Box>
                        <input
                          type="file"
                          accept="image/*"
                          id="assessment-photo-upload"
                          style={{ display: 'none' }}
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              if (file.size > 10 * 1024 * 1024) {
                                setError('Image must be smaller than 10MB.')
                                return
                              }
                              setAssessmentFile(file)
                              setAssessmentPreview(URL.createObjectURL(file))
                            }
                          }}
                        />
                        <label htmlFor="assessment-photo-upload">
                          <Button
                            variant="outlined"
                            component="span"
                            size="small"
                            startIcon={<AddPhotoAlternateOutlinedIcon fontSize="small" />}
                            sx={{
                              textTransform: 'none',
                              fontSize: '0.8125rem',
                              borderColor: theme.palette.divider,
                              color: 'text.primary',
                            }}
                          >
                            Attach Photo
                          </Button>
                        </label>
                      </Box>
                    )}
                  </Box>

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
        )}

        {/* 2B. ISSUE DESCRIPTION */}
        <Box
          id="tour-issue-description"
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

          {/* Attached Issue Photo if present */}
          {ticket.image_url && (
            <Box sx={{ mt: 2 }}>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 800,
                  color: 'text.secondary',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  display: 'block',
                  mb: 1,
                }}
              >
                ATTACHED ISSUE PHOTO
              </Typography>
              <Box
                component="img"
                src={ticket.image_url}
                alt="Reported Issue Photo"
                onClick={() => setLightboxUrl(ticket.image_url)}
                sx={{
                  maxHeight: 180,
                  maxWidth: 280,
                  borderRadius: 2,
                  border: `1px solid ${theme.palette.divider}`,
                  cursor: 'pointer',
                  objectFit: 'cover',
                  display: 'block',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  '&:hover': {
                    transform: 'scale(1.02)',
                    boxShadow: isDark ? '0 6px 18px rgba(0,0,0,0.4)' : '0 6px 18px rgba(0,0,0,0.12)',
                  },
                }}
              />
            </Box>
          )}
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
              <Tab label={`All Actions (${allActionsCount})`} value="all" />
              <Tab label={`Comments (${commentsCount})`} value="comments" />
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

                    {/* Comment content bubble */}
                    {(() => {
                      const commentBody =
                        act.comment_content ||
                        act.metadata?.content ||
                        (act.action_type === 'COMMENT_ADDED' && act.metadata?.comment_id
                          ? ticket?.comments?.find((c) => c.id === act.metadata.comment_id)?.content
                          : null)

                      if (!commentBody) return null

                      return (
                        <Paper
                          elevation={0}
                          sx={{
                            mt: 1,
                            p: 1.5,
                            borderRadius: 2,
                            bgcolor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#F8FAFC',
                            border: `1px solid ${theme.palette.divider}`,
                          }}
                        >
                          <Typography
                            variant="body2"
                            sx={{
                              color: 'text.primary',
                              fontSize: '0.85rem',
                              lineHeight: 1.5,
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                            }}
                          >
                            {commentBody}
                          </Typography>
                        </Paper>
                      )
                    })()}

                    {/* Attached Photo in Activity / Comment */}
                    {(() => {
                      const actImg =
                        act.image_url ||
                        act.metadata?.image_url ||
                        (act.action_type === 'COMMENT_ADDED' && act.metadata?.comment_id
                          ? ticket?.comments?.find((c) => c.id === act.metadata.comment_id)?.image_url
                          : null)

                      if (!actImg) return null

                      return (
                        <Box sx={{ mt: 1 }}>
                          <Box
                            component="img"
                            src={actImg}
                            alt="Activity attachment"
                            onClick={() => setLightboxUrl(actImg)}
                            sx={{
                              maxHeight: 140,
                              maxWidth: 220,
                              borderRadius: 1.5,
                              border: `1px solid ${theme.palette.divider}`,
                              cursor: 'pointer',
                              objectFit: 'cover',
                              display: 'block',
                              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                              '&:hover': {
                                transform: 'scale(1.03)',
                                boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.4)' : '0 4px 12px rgba(0,0,0,0.15)',
                              },
                            }}
                          />
                        </Box>
                      )
                    })()}
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
          flexDirection: 'column',
          gap: 1.25,
        }}
      >
        {/* Comment Image Preview */}
        {commentPreview && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                position: 'relative',
                display: 'inline-block',
                width: 52,
                height: 52,
                borderRadius: 1.5,
                overflow: 'hidden',
                border: `1px solid ${theme.palette.divider}`,
              }}
            >
              <Box
                component="img"
                src={commentPreview}
                alt="Comment attachment preview"
                sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <IconButton
                size="small"
                onClick={() => {
                  setCommentFile(null)
                  setCommentPreview('')
                }}
                sx={{
                  position: 'absolute',
                  top: 2,
                  right: 2,
                  bgcolor: 'rgba(0,0,0,0.65)',
                  color: '#fff',
                  p: '2px',
                  '&:hover': { bgcolor: 'rgba(0,0,0,0.85)' },
                }}
              >
                <CloseIcon sx={{ fontSize: 13 }} />
              </IconButton>
            </Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
              {commentFile?.name} ({(commentFile?.size / 1024).toFixed(0)} KB)
            </Typography>
          </Box>
        )}

        <Box id="tour-comments-box" sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
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

          <input
            type="file"
            accept="image/*"
            id="comment-photo-input"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) {
                if (file.size > 10 * 1024 * 1024) {
                  setError('Image must be smaller than 10MB.')
                  return
                }
                setCommentFile(file)
                setCommentPreview(URL.createObjectURL(file))
              }
            }}
          />
          <label htmlFor="comment-photo-input">
            <IconButton
              component="span"
              color={commentFile ? 'primary' : 'default'}
              disabled={commentSubmitting}
              sx={{
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 2,
                p: 1,
              }}
              title="Attach photo"
            >
              <AddPhotoAlternateOutlinedIcon fontSize="small" />
            </IconButton>
          </label>

          <Button
            variant="contained"
            onClick={handlePostComment}
            disabled={commentSubmitting || (!commentText.trim() && !commentFile)}
            endIcon={<SendIcon />}
            sx={{
              px: { xs: 1.5, sm: 2.5 },
              minWidth: { xs: 'auto', sm: 84 },
              fontWeight: 700,
              bgcolor: isDark ? '#3B82F6' : '#0F172A',
              '&:hover': {
                bgcolor: isDark ? '#2563EB' : '#1E293B',
              },
              whiteSpace: 'nowrap',
            }}
          >
            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
              {commentSubmitting ? 'Posting...' : 'Post'}
            </Box>
          </Button>
        </Box>
      </Box>

      {/* Mark Resolved with Optional Proof Photo Dialog */}
      <Dialog
        open={resolveDialogOpen}
        onClose={() => !actionLoading && setResolveDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            bgcolor: theme.palette.background.paper,
            border: `1px solid ${theme.palette.divider}`,
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, pb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Mark Ticket Resolved</span>
          <IconButton
            size="small"
            onClick={() => setResolveDialogOpen(false)}
            disabled={actionLoading}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            Confirm that the reported issue has been completely fixed and verified.
          </Typography>

          <TextField
            label="Resolution Notes (Optional)"
            multiline
            rows={2}
            size="small"
            fullWidth
            value={resolveNotes}
            onChange={(e) => setResolveNotes(e.target.value)}
            placeholder="e.g. Filter replaced and temperature tested normal."
            sx={{ mb: 2 }}
          />

          <Box>
            <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', display: 'block', mb: 0.75 }}>
              Completion / Proof Photo (Optional)
            </Typography>
            {resolvePreview ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  component="img"
                  src={resolvePreview}
                  alt="Resolution proof"
                  sx={{
                    width: 64,
                    height: 64,
                    borderRadius: 1.5,
                    objectFit: 'cover',
                    border: `1px solid ${theme.palette.divider}`,
                  }}
                />
                <Button
                  size="small"
                  color="error"
                  startIcon={<DeleteOutlineIcon fontSize="small" />}
                  onClick={() => {
                    setResolveFile(null)
                    setResolvePreview('')
                  }}
                  sx={{ textTransform: 'none', fontSize: '0.8rem' }}
                >
                  Remove Photo
                </Button>
              </Box>
            ) : (
              <Box>
                <input
                  type="file"
                  accept="image/*"
                  id="resolve-photo-input"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      if (file.size > 10 * 1024 * 1024) {
                        setError('Image must be smaller than 10MB.')
                        return
                      }
                      setResolveFile(file)
                      setResolvePreview(URL.createObjectURL(file))
                    }
                  }}
                />
                <label htmlFor="resolve-photo-input">
                  <Button
                    variant="outlined"
                    component="span"
                    size="small"
                    startIcon={<AddPhotoAlternateOutlinedIcon fontSize="small" />}
                    sx={{
                      textTransform: 'none',
                      fontSize: '0.8125rem',
                      borderColor: theme.palette.divider,
                      color: 'text.primary',
                    }}
                  >
                    Attach Completion Photo
                  </Button>
                </label>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 1 }}>
          <Button
            size="small"
            onClick={() => setResolveDialogOpen(false)}
            disabled={actionLoading}
            sx={{ textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="success"
            size="small"
            onClick={handleMarkResolved}
            disabled={actionLoading}
            sx={{ textTransform: 'none', fontWeight: 700, px: 2.5 }}
          >
            {actionLoading ? 'Resolving...' : 'Confirm & Resolve'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Lightbox Dialog for full-size viewing */}
      <Dialog
        open={Boolean(lightboxUrl)}
        onClose={() => setLightboxUrl(null)}
        maxWidth="md"
        PaperProps={{
          sx: {
            bgcolor: 'transparent',
            boxShadow: 'none',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          },
        }}
      >
        <Box sx={{ position: 'relative', maxWidth: '90vw', maxHeight: '85vh', p: 1 }}>
          <IconButton
            onClick={() => setLightboxUrl(null)}
            sx={{
              position: 'absolute',
              top: 12,
              right: 12,
              bgcolor: 'rgba(0,0,0,0.7)',
              color: '#FFFFFF',
              zIndex: 10,
              '&:hover': { bgcolor: 'rgba(0,0,0,0.9)' },
            }}
          >
            <CloseIcon />
          </IconButton>
          <Box
            component="img"
            src={lightboxUrl}
            alt="Enlarged preview"
            sx={{
              maxWidth: '100%',
              maxHeight: '80vh',
              borderRadius: 2,
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
              display: 'block',
              objectFit: 'contain',
            }}
          />
        </Box>
      </Dialog>
    </Paper>
  )
}
