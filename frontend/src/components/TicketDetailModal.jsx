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
import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined'
import DeleteOutlineIcon from '@mui/icons-material/Delete'
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

  const statusCfg = ticket ? getStatusBadgeConfig(ticket.status) : {}
  const floorsStr = ticket && Array.isArray(ticket.floors) ? ticket.floors.join(', ') : ticket?.floors || ''
  const locationStr = ticket ? `${ticket.property_name || 'Property'}; ${floorsStr}` : ''

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
              {ticket.ac_unit_number && (
                <Chip
                  label={`Asset ID: ${ticket.ac_unit_number}`}
                  size="small"
                  sx={{
                    bgcolor: '#E0F2FE',
                    color: '#0369A1',
                    fontWeight: 700,
                    fontSize: '0.725rem',
                    border: '1px solid #BAE6FD',
                  }}
                />
              )}
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
                      onClick={() => setResolveDialogOpen(true)}
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
                          onClick={() => setResolveDialogOpen(true)}
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

                      {/* Assessment Photo Upload */}
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="caption" sx={{ fontWeight: 600, color: '#64748B', display: 'block', mb: 0.75 }}>
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
                                border: '1px solid #CBD5E1',
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
                              id="modal-assessment-photo-upload"
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
                            <label htmlFor="modal-assessment-photo-upload">
                              <Button
                                variant="outlined"
                                component="span"
                                size="small"
                                startIcon={<AddPhotoAlternateOutlinedIcon fontSize="small" />}
                                sx={{
                                  textTransform: 'none',
                                  fontSize: '0.8125rem',
                                  borderColor: '#CBD5E1',
                                  color: '#334155',
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

              {/* Attached Issue Photo */}
              {ticket.image_url && (
                <Box sx={{ mt: 2 }}>
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 800,
                      color: '#64748B',
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      display: 'block',
                      mb: 1,
                    }}
                  >
                    Attached Issue Photo
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
                      border: '1px solid #CBD5E1',
                      cursor: 'pointer',
                      objectFit: 'cover',
                      display: 'block',
                      transition: 'transform 0.15s ease',
                      '&:hover': {
                        transform: 'scale(1.02)',
                      },
                    }}
                  />
                </Box>
              )}
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
                  <Tab label={`All Actions (${allActionsCount})`} value="all" />
                  <Tab label={`Comments (${commentsCount})`} value="comments" />
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
                                bgcolor: '#F8FAFC',
                                border: '1px solid #E2E8F0',
                              }}
                            >
                              <Typography
                                variant="body2"
                                sx={{
                                  color: '#1E293B',
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
                                  border: '1px solid #E2E8F0',
                                  cursor: 'pointer',
                                  objectFit: 'cover',
                                  display: 'block',
                                  transition: 'transform 0.15s ease',
                                  '&:hover': {
                                    transform: 'scale(1.03)',
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
          flexDirection: 'column',
          gap: 1.25,
        }}
      >
        {/* Comment Image Preview */}
        {commentPreview && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
            <Box
              sx={{
                position: 'relative',
                display: 'inline-block',
                width: 52,
                height: 52,
                borderRadius: 1.5,
                overflow: 'hidden',
                border: '1px solid #CBD5E1',
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
            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 500 }}>
              {commentFile?.name} ({(commentFile?.size / 1024).toFixed(0)} KB)
            </Typography>
          </Box>
        )}

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', width: '100%' }}>
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

          <input
            type="file"
            accept="image/*"
            id="modal-comment-photo-input"
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
          <label htmlFor="modal-comment-photo-input">
            <IconButton
              component="span"
              color={commentFile ? 'primary' : 'default'}
              disabled={commentSubmitting}
              sx={{
                border: '1px solid #CBD5E1',
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
            sx={{ px: 3, fontWeight: 700, whiteSpace: 'nowrap' }}
          >
            {commentSubmitting ? 'Posting...' : 'Post'}
          </Button>
        </Box>
      </DialogActions>

      {/* Mark Resolved with Optional Proof Photo Dialog */}
      <Dialog
        open={resolveDialogOpen}
        onClose={() => !actionLoading && setResolveDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            bgcolor: '#FFFFFF',
            border: '1px solid #CBD5E1',
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
          <Typography variant="body2" sx={{ color: '#64748B', mb: 2 }}>
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
            <Typography variant="caption" sx={{ fontWeight: 600, color: '#64748B', display: 'block', mb: 0.75 }}>
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
                    border: '1px solid #CBD5E1',
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
                  id="modal-resolve-photo-input"
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
                <label htmlFor="modal-resolve-photo-input">
                  <Button
                    variant="outlined"
                    component="span"
                    size="small"
                    startIcon={<AddPhotoAlternateOutlinedIcon fontSize="small" />}
                    sx={{
                      textTransform: 'none',
                      fontSize: '0.8125rem',
                      borderColor: '#CBD5E1',
                      color: '#334155',
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
    </Dialog>
  )
}
