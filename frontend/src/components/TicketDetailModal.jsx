import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
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
  Paper,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import SendIcon from '@mui/icons-material/Send'
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd'
import SwapCallsIcon from '@mui/icons-material/SwapCalls'
import BuildIcon from '@mui/icons-material/Build'
import { getStatusBadgeConfig } from '../utils/status'
import { useAuth } from '../context/AuthContext'
import client from '../api/client'

export const TicketDetailModal = ({ open, ticketId, onClose, onTicketUpdated }) => {
  const { user } = useAuth()
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
    if (open && ticketId) {
      fetchTicketDetails(ticketId)
      fetchAuxData()
      setActiveActionPanel(null)
      setActionSuccess(null)
      setError(null)
    }
  }, [open, ticketId])

  if (!open) return null

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

  const statusCfg = ticket ? getStatusBadgeConfig(ticket.status) : {}
  const floorsStr = ticket && Array.isArray(ticket.floors) ? ticket.floors.join(', ') : ticket?.floors || ''
  const locationStr = ticket ? `${ticket.property_name || 'Property'}; ${floorsStr}` : ''

  // Filter activities for tabs
  const filteredActivities = ticket?.activities
    ? activityTab === 'comments'
      ? ticket.activities.filter((a) => a.action_type === 'COMMENT_ADDED')
      : ticket.activities
    : []

  // Check role & available actions
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
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      scroll="paper"
      PaperProps={{
        sx: {
          borderRadius: 3,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      {/* Dialog Header */}
      <DialogTitle
        component="div"
        sx={{
          p: 2.5,
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          bgcolor: '#FFFFFF',
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap">
          <Typography component="div" variant="h6" sx={{ fontWeight: 800, color: '#0F172A' }}>
            Ticket Details
          </Typography>
          {ticket && (
            <>
              <Chip
                label={`#${ticket.ticket_number}`}
                size="small"
                variant="outlined"
                sx={{ fontWeight: 700, borderColor: '#CBD5E1', color: '#475569' }}
              />
              <Chip
                label={statusCfg.label}
                size="small"
                sx={{
                  bgcolor: statusCfg.bg,
                  color: statusCfg.text,
                  border: `1px solid ${statusCfg.border}`,
                  fontWeight: 700,
                  fontSize: '0.75rem',
                }}
              />
            </>
          )}
        </Stack>
        <IconButton onClick={onClose} size="small" sx={{ color: '#64748B' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      {/* Dialog Content */}
      <DialogContent sx={{ p: { xs: 2, sm: 3 }, bgcolor: '#F8FAFC' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : error && !ticket ? (
          <Alert severity="error">{error}</Alert>
        ) : ticket ? (
          <Stack spacing={2.5}>
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

            {/* Wireframe Sticky CTA Banner Section */}
            {!isResolvedOrClosed && (
              <Box
                sx={{
                  bgcolor: '#FFFFFF',
                  borderRadius: 2,
                  border: '1px solid #CBD5E1',
                  p: 2,
                  boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
                }}
              >
              {/* CLIENT POC CTA BANNER */}
              {isClient && (
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  alignItems={{ xs: 'flex-start', sm: 'center' }}
                  justifyContent="space-between"
                  spacing={1.5}
                >
                  <Typography variant="body2" sx={{ color: '#334155', fontWeight: 600 }}>
                    {ticket.status === 'RESOLVED'
                      ? 'Ticket has been resolved.'
                      : 'Ticket created successfully. If the issue is resolved, you can mark it as resolved.'}
                  </Typography>
                  {canMarkResolved && (
                    <Button
                      variant="contained"
                      color="success"
                      size="small"
                      startIcon={<CheckCircleOutlinedIcon />}
                      onClick={handleMarkResolved}
                      disabled={actionLoading}
                      sx={{ fontWeight: 700, px: 2, ml: { sm: 'auto' } }}
                    >
                      Mark Resolved
                    </Button>
                  )}
                </Stack>
              )}

              {/* FACILITY MANAGER BANNER */}
              {isFM && (
                <Typography variant="body2" sx={{ color: '#64748B', fontStyle: 'italic' }}>
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
                    spacing={1.5}
                  >
                    <Typography variant="body2" sx={{ color: '#334155', fontWeight: 600 }}>
                      A new ticket has been assigned to you. Review it and take the next action.
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ ml: { sm: 'auto' } }}>
                      {canAssignWorker && (
                        <Button
                          variant={activeActionPanel === 'ASSIGN_WORKER' ? 'contained' : 'outlined'}
                          size="small"
                          startIcon={<AssignmentIndIcon />}
                          onClick={() =>
                            setActiveActionPanel(activeActionPanel === 'ASSIGN_WORKER' ? null : 'ASSIGN_WORKER')
                          }
                          sx={{ fontWeight: 700 }}
                        >
                          Assign Worker
                        </Button>
                      )}
                      {canChangeDept && (
                        <Button
                          variant={activeActionPanel === 'CHANGE_DEPT' ? 'contained' : 'outlined'}
                          color="secondary"
                          size="small"
                          startIcon={<SwapCallsIcon />}
                          onClick={() =>
                            setActiveActionPanel(activeActionPanel === 'CHANGE_DEPT' ? null : 'CHANGE_DEPT')
                          }
                          sx={{ fontWeight: 700 }}
                        >
                          Change Department
                        </Button>
                      )}
                      {canMarkResolved && (
                        <Button
                          variant="contained"
                          color="success"
                          size="small"
                          startIcon={<CheckCircleOutlinedIcon />}
                          onClick={handleMarkResolved}
                          disabled={actionLoading}
                          sx={{ fontWeight: 700 }}
                        >
                          Mark Resolved
                        </Button>
                      )}
                    </Stack>
                  </Stack>

                  {/* Expanded Assign Worker Panel */}
                  {activeActionPanel === 'ASSIGN_WORKER' && (
                    <Paper variant="outlined" sx={{ p: 2, bgcolor: '#F8FAFC', borderRadius: 2 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
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

                        <Box sx={{ p: 1.5, bgcolor: '#EFF6FF', borderRadius: 1.5, border: '1px solid #BFDBFE' }}>
                          <Typography variant="caption" sx={{ color: '#1E40AF', display: 'block', lineHeight: 1.5 }}>
                            1. Current Assignee(s) field will be updated.<br />
                            2. An ACTIVITY log will be permanently added.<br />
                            3. The Assigned Worker will start seeing the ticket in their view.
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
                            {actionLoading ? 'Assigning...' : 'Confirm Assignment'}
                          </Button>
                        </Stack>
                      </Stack>
                    </Paper>
                  )}

                  {/* Expanded Change Department Panel */}
                  {activeActionPanel === 'CHANGE_DEPT' && (
                    <Paper variant="outlined" sx={{ p: 2, bgcolor: '#F8FAFC', borderRadius: 2 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
                        Transfer Ticket to Another Department
                      </Typography>
                      <Stack spacing={2}>
                        <FormControl size="small" fullWidth>
                          <InputLabel>Select Department*</InputLabel>
                          <Select
                            value={selectedDeptId}
                            onChange={(e) => setSelectedDeptId(e.target.value)}
                            label="Select Department*"
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
                          label="Add Forwarding Note*"
                          multiline
                          rows={2}
                          size="small"
                          fullWidth
                          value={forwardingNote}
                          onChange={(e) => setForwardingNote(e.target.value)}
                          placeholder="Explain reason for re-routing to the other department..."
                        />

                        <Box sx={{ p: 1.5, bgcolor: '#EFF6FF', borderRadius: 1.5, border: '1px solid #BFDBFE' }}>
                          <Typography variant="caption" sx={{ color: '#1E40AF', display: 'block', lineHeight: 1.5 }}>
                            1. Department and Current Assignee will be updated to the new Department POC.<br />
                            2. An ACTIVITY log and forwarding comment will be recorded.<br />
                            3. The new Department POC will immediately take over this ticket.
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
                            {actionLoading ? 'Transferring...' : 'Confirm Transfer'}
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
                    spacing={1.5}
                  >
                    <Typography variant="body2" sx={{ color: '#334155', fontWeight: 600 }}>
                      {ticket.status === 'PENDING_TECHNICIAN_ASSIGNMENT'
                        ? `Department Manager (${ticket.assigned_to_name || 'Technical Manager'}) has to approve. Once approved, action will be required.`
                        : ticket.status === 'PENDING_DEPARTMENT_REVIEW'
                        ? 'Assessment submitted. Department Manager is currently reviewing required parts / approvals.'
                        : 'You have been assigned this ticket. Take action.'}
                    </Typography>
                    {canSubmitAssessment && (
                      <Button
                        variant={activeActionPanel === 'ASSESSMENT' ? 'contained' : 'contained'}
                        color="primary"
                        size="small"
                        startIcon={<BuildIcon />}
                        onClick={() =>
                          setActiveActionPanel(activeActionPanel === 'ASSESSMENT' ? null : 'ASSESSMENT')
                        }
                        sx={{ fontWeight: 700 }}
                      >
                        Submit Assessment
                      </Button>
                    )}
                  </Stack>

                  {/* Expanded Submit Assessment Panel */}
                  {activeActionPanel === 'ASSESSMENT' && (
                    <Paper variant="outlined" sx={{ p: 2, bgcolor: '#F8FAFC', borderRadius: 2 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                        Field Technician Assessment
                      </Typography>
                      <RadioGroup
                        value={assessmentType}
                        onChange={(e) => setAssessmentType(e.target.value)}
                        sx={{ gap: 1, mb: 2 }}
                      >
                        <FormControlLabel
                          value="FULLY_RESOLVED"
                          control={<Radio size="small" />}
                          label={
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 700, color: '#15803D' }}>
                                Mark Fully Resolved
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#64748B' }}>
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
                              <Typography variant="body2" sx={{ fontWeight: 700, color: '#B45309' }}>
                                Mark Partially Resolved
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#64748B' }}>
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
                              <Typography variant="body2" sx={{ fontWeight: 700, color: '#B91C1C' }}>
                                Suggest Department/Worker Change
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#64748B' }}>
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
                        placeholder="Add inspection observations or parts used..."
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
                          {actionLoading ? 'Submitting...' : 'Submit Assessment'}
                        </Button>
                      </Stack>
                    </Paper>
                  )}
                </Stack>
              )}
            </Box>
            )}

            {/* Ticket Header & Metadata */}
            <Box sx={{ bgcolor: '#FFFFFF', borderRadius: 2, p: 2.5, border: '1px solid #E2E8F0' }}>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A', mb: 1 }}>
                {ticket.title}
              </Typography>

              <Stack direction="row" spacing={1.5} flexWrap="wrap" alignItems="center" sx={{ mb: 2 }}>
                <Chip
                  icon={<PlaceOutlinedIcon sx={{ fontSize: '0.9rem !important' }} />}
                  label={locationStr}
                  size="small"
                  sx={{ bgcolor: '#F1F5F9', fontWeight: 600, color: '#334155' }}
                />
                <Chip
                  label={`Client: ${ticket.client_name}`}
                  size="small"
                  sx={{ bgcolor: '#E0F2FE', color: '#0369A1', fontWeight: 600 }}
                />
                <Chip
                  label={`Dept: ${ticket.department_name}`}
                  size="small"
                  sx={{ bgcolor: '#F3E8FF', color: '#7E22CE', fontWeight: 600 }}
                />
              </Stack>

              <Stack
                direction="row"
                spacing={3}
                flexWrap="wrap"
                sx={{ pt: 1.5, borderTop: '1px solid #F1F5F9', color: '#475569', fontSize: '0.85rem' }}
              >
                <div>
                  <span style={{ color: '#64748B' }}>Created: </span>
                  <strong>{ticket.created_at}</strong> by{' '}
                  <strong>{ticket.created_by_name}</strong> ({ticket.created_by_title || 'Client POC'})
                </div>
                <div>
                  <span style={{ color: '#64748B' }}>Current Assignee: </span>
                  <strong>
                    {ticket.assigned_to_name
                      ? `${ticket.assigned_to_name} (${ticket.assigned_to_title || 'Assigned'})`
                      : 'Unassigned'}
                  </strong>
                </div>
              </Stack>
            </Box>

            {/* ISSUE DESCRIPTION BOX */}
            <Box sx={{ bgcolor: '#FFFFFF', borderRadius: 2, p: 2.5, border: '1px solid #E2E8F0' }}>
              <Typography
                variant="caption"
                sx={{ fontWeight: 800, color: '#64748B', letterSpacing: '0.05em', textTransform: 'uppercase' }}
              >
                Issue Description
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  mt: 1,
                  color: '#334155',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {ticket.description || 'No detailed description provided.'}
              </Typography>
            </Box>

            {/* ACTIVITY & AUDIT SECTION */}
            <Box sx={{ bgcolor: '#FFFFFF', borderRadius: 2, p: 2.5, border: '1px solid #E2E8F0' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0F172A' }}>
                  ACTIVITY ({ticket.activities?.length || 0} events)
                </Typography>
                <Tabs
                  value={activityTab}
                  onChange={(e, val) => setActivityTab(val)}
                  sx={{ minHeight: 32, '& .MuiTab-root': { minHeight: 32, py: 0.5, px: 1.5, fontSize: '0.75rem', fontWeight: 700 } }}
                >
                  <Tab label="All Actions" value="all" />
                  <Tab label="Comments" value="comments" />
                </Tabs>
              </Stack>

              <Divider sx={{ mb: 2 }} />

              {/* Timeline events */}
              <Stack spacing={2}>
                {filteredActivities.length === 0 ? (
                  <Typography variant="body2" sx={{ color: '#94A3B8', py: 2, textAlign: 'center' }}>
                    No activity records found.
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
                        borderBottom: '1px dashed #F1F5F9',
                      }}
                    >
                      <Avatar
                        sx={{
                          width: 30,
                          height: 30,
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          bgcolor: act.actor ? '#0F172A' : '#64748B',
                        }}
                      >
                        {act.actor_initials}
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="body2" sx={{ fontWeight: 700, color: '#1E293B' }}>
                            {act.description}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                            {act.created_at}
                          </Typography>
                        </Stack>

                        {/* Metadata badge details matching wireframe */}
                        {act.metadata && Object.keys(act.metadata).length > 0 && (
                          <Box sx={{ mt: 0.75, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            {act.metadata.assigned_from && act.metadata.assigned_to && (
                              <Chip
                                label={`History: ${act.metadata.assigned_from} → ${act.metadata.assigned_to}`}
                                size="small"
                                sx={{ bgcolor: '#F1F5F9', fontSize: '0.7rem', height: 22 }}
                              />
                            )}
                            {act.metadata.old_department && act.metadata.new_department && (
                              <Chip
                                label={`Dept: ${act.metadata.old_department} → ${act.metadata.new_department}`}
                                size="small"
                                sx={{ bgcolor: '#F3E8FF', color: '#7E22CE', fontSize: '0.7rem', height: 22 }}
                              />
                            )}
                            {act.metadata.old_status && act.metadata.new_status && (
                              <Chip
                                label={`Status: ${act.metadata.old_status} → ${act.metadata.new_status}`}
                                size="small"
                                sx={{ bgcolor: '#FEF3C7', color: '#B45309', fontSize: '0.7rem', height: 22 }}
                              />
                            )}
                            {act.metadata.forwarding_note && (
                              <Typography variant="caption" sx={{ color: '#475569', display: 'block', fontStyle: 'italic', width: '100%' }}>
                                Note: {act.metadata.forwarding_note}
                              </Typography>
                            )}
                            {act.metadata.notes && (
                              <Typography variant="caption" sx={{ color: '#475569', display: 'block', fontStyle: 'italic', width: '100%' }}>
                                Assessment: {act.metadata.notes}
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
          </Stack>
        ) : null}
      </DialogContent>

      {/* Sticky Bottom Comment Section matching wireframe */}
      <DialogActions
        sx={{
          p: 2,
          borderTop: '1px solid #E2E8F0',
          bgcolor: '#FFFFFF',
          display: 'flex',
          gap: 1.5,
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
            bgcolor: '#F8FAFC',
            borderRadius: 1.5,
          }}
        />
        <Button
          variant="contained"
          onClick={handlePostComment}
          disabled={commentSubmitting || !commentText.trim()}
          endIcon={<SendIcon />}
          sx={{ px: 3, fontWeight: 700 }}
        >
          Post
        </Button>
      </DialogActions>
    </Dialog>
  )
}
