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
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Alert,
  IconButton,
  CircularProgress,
  useTheme,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import FlashOnIcon from '@mui/icons-material/FlashOn'
import { useAuth } from '../context/AuthContext'
import { useColorMode } from '../context/ColorModeContext'
import client from '../api/client'

export const CreateTicketModal = ({ open, onClose, onTicketCreated }) => {
  const theme = useTheme()
  const { user } = useAuth()
  const { mode } = useColorMode()
  const isDark = mode === 'dark'

  const [auxData, setAuxData] = useState({ clients: [], departments: [], quick_issues: [] })
  const [selectedClientId, setSelectedClientId] = useState('')
  const [selectedFloors, setSelectedFloors] = useState([])
  const [issueTitle, setIssueTitle] = useState('')
  const [description, setDescription] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const isClient = user?.role === 'CLIENT_POC'

  // Fetch auxiliary options
  useEffect(() => {
    if (open) {
      client
        .get('/ticketing/auxiliary-data/')
        .then((res) => {
          setAuxData(res.data)
          if (isClient && user?.client) {
            setSelectedClientId(user.client)
            const clientObj = res.data.clients?.find((c) => c.id === user.client)
            if (clientObj?.occupied_floors) {
              setSelectedFloors(clientObj.occupied_floors)
            }
          } else if (res.data.clients?.length > 0) {
            setSelectedClientId(res.data.clients[0].id)
            if (res.data.clients[0].occupied_floors) {
              setSelectedFloors(res.data.clients[0].occupied_floors)
            }
          }
        })
        .catch((err) => console.error('Error fetching aux data:', err))

      // Reset form
      setIssueTitle('')
      setDescription('')
      setError(null)
    }
  }, [open, isClient, user])

  // Active client object
  const currentClient = auxData.clients?.find((c) => c.id === selectedClientId)
  const availableFloors = currentClient?.occupied_floors || ['1F', '2F', '3F']

  // Update floors when client changes
  const handleClientChange = (clientId) => {
    setSelectedClientId(clientId)
    const clientObj = auxData.clients?.find((c) => c.id === clientId)
    if (clientObj?.occupied_floors) {
      setSelectedFloors(clientObj.occupied_floors)
    }
  }

  // Quick Issues pills
  const quickIssues = auxData.quick_issues || [
    { title: 'AC not cooling' },
    { title: 'Internet not working' },
    { title: 'Pantry not cleaned' },
    { title: 'Lights flickering' },
  ]

  const handleQuickIssueTap = (title) => {
    setIssueTitle(title)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!issueTitle.trim()) {
      setError('Issue title is required.')
      return
    }
    if (selectedFloors.length === 0) {
      setError('Please select at least one floor.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const payload = {
        title: issueTitle.trim(),
        description: description.trim(),
        floors: selectedFloors,
      }
      if (!isClient) {
        payload.client = selectedClientId
      }

      await client.post('/ticketing/tickets/', payload)
      onClose()
      if (onTicketCreated) onTicketCreated()
    } catch (err) {
      console.error('Failed to create ticket:', err)
      const errDetail = err.response?.data
      if (typeof errDetail === 'object') {
        const firstKey = Object.keys(errDetail)[0]
        setError(`${firstKey}: ${errDetail[firstKey]}`)
      } else {
        setError(errDetail || 'Failed to submit ticket. Please check your inputs.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          bgcolor: theme.palette.background.paper,
          border: `1px solid ${theme.palette.divider}`,
        },
      }}
    >
      <form onSubmit={handleSubmit} data-testid="ticket-form">
        <DialogTitle
          component="div"
          sx={{
            p: 2.5,
            borderBottom: `1px solid ${theme.palette.divider}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Typography component="div" variant="h6" sx={{ fontWeight: 800, color: 'text.primary' }}>
            Create New Ticket
          </Typography>
          <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 3 }}>
          <Stack spacing={2.5}>
            {error && <Alert severity="error">{error}</Alert>}

            {/* Client Selection (Internal Staff view only) */}
            {!isClient && (
              <FormControl size="small" fullWidth required>
                <InputLabel id="client-select-label">Client*</InputLabel>
                <Select
                  labelId="client-select-label"
                  value={selectedClientId}
                  onChange={(e) => handleClientChange(e.target.value)}
                  label="Client*"
                >
                  {auxData.clients?.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.name} ({c.property_name})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {/* Client Fixed Banner for Client POC */}
            {isClient && currentClient && (
              <Box
                sx={{
                  p: 1.5,
                  bgcolor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#F8FAFC',
                  borderRadius: 2,
                  border: `1px solid ${theme.palette.divider}`,
                }}
              >
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                  Client Office
                </Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                  {currentClient.name} • {currentClient.property_name}
                </Typography>
              </Box>
            )}

            {/* Floor(s) Multi-Select */}
            {availableFloors.length > 0 && (
              <FormControl size="small" fullWidth required>
                <InputLabel id="floors-select-label">Floor(s)*</InputLabel>
                <Select
                  labelId="floors-select-label"
                  multiple
                  value={selectedFloors}
                  onChange={(e) => {
                    const value = e.target.value
                    setSelectedFloors(typeof value === 'string' ? value.split(',') : value)
                  }}
                  input={<OutlinedInput label="Floor(s)*" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((val) => (
                        <Chip
                          key={val}
                          label={val}
                          size="small"
                          sx={{
                            height: 24,
                            fontWeight: 700,
                            bgcolor: isDark ? '#1E293B' : '#E2E8F0',
                            color: 'text.primary',
                          }}
                        />
                      ))}
                    </Box>
                  )}
                >
                  {availableFloors.map((floor) => (
                    <MenuItem key={floor} value={floor}>
                      {floor}
                    </MenuItem>
                  ))}
                </Select>
                <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5 }}>
                  {isClient
                    ? 'Your office has multiple floors - please select where the issue is.'
                    : 'This office has multiple floors - please select where the issue is.'}
                </Typography>
              </FormControl>
            )}

            {/* Quick Issues Pills - Tap to autofill */}
            <Box>
              <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 1 }}>
                <FlashOnIcon sx={{ fontSize: 16, color: '#F59E0B' }} />
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                  Quick Issues - tap to autofill
                </Typography>
              </Stack>
              <Stack direction="row" flexWrap="wrap" gap={1}>
                {quickIssues.map((item, idx) => {
                  const isSelected = issueTitle === item.title
                  return (
                    <Chip
                      key={idx}
                      label={item.title}
                      onClick={() => handleQuickIssueTap(item.title)}
                      clickable
                      data-testid={`quick-issue-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                      sx={{
                        fontWeight: 600,
                        bgcolor: isSelected
                          ? isDark ? '#3B82F6' : '#0F172A'
                          : isDark ? 'rgba(255, 255, 255, 0.06)' : '#F1F5F9',
                        color: isSelected
                          ? '#FFFFFF'
                          : 'text.primary',
                        border: isSelected
                          ? '1px solid transparent'
                          : `1px solid ${theme.palette.divider}`,
                        '&:hover': {
                          bgcolor: isSelected
                            ? isDark ? '#2563EB' : '#1E293B'
                            : isDark ? 'rgba(255, 255, 255, 0.12)' : '#E2E8F0',
                        },
                      }}
                    />
                  )
                })}
              </Stack>
            </Box>

            {/* Issue Title Input */}
            <TextField
              label="Issue(s)*"
              required
              fullWidth
              size="small"
              placeholder="Type or search issue"
              value={issueTitle}
              onChange={(e) => setIssueTitle(e.target.value)}
              inputProps={{ 'data-testid': 'ticket-issue-input' }}
            />

            {/* Description Textarea */}
            <TextField
              label="Description: Describe the issue (optional)"
              multiline
              rows={3}
              fullWidth
              size="small"
              placeholder="Provide specific details, affected desks, or observations..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              inputProps={{ 'data-testid': 'ticket-desc-input' }}
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2.5, borderTop: `1px solid ${theme.palette.divider}` }}>
          <Button onClick={onClose} disabled={submitting} sx={{ fontWeight: 600 }}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={submitting || !issueTitle.trim()}
            data-testid="ticket-submit-btn"
            startIcon={submitting && <CircularProgress size={16} color="inherit" />}
            sx={{
              fontWeight: 700,
              px: 3,
              bgcolor: isDark ? '#3B82F6' : '#0F172A',
              '&:hover': { bgcolor: isDark ? '#2563EB' : '#1E293B' },
            }}
          >
            {submitting ? 'Submitting...' : 'Submit'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
