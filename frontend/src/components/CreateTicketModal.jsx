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
  FormHelperText,
  Alert,
  IconButton,
  CircularProgress,
  useTheme,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import FlashOnIcon from '@mui/icons-material/FlashOn'
import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined'
import DeleteOutlineIcon from '@mui/icons-material/Delete'
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
  const [selectedFloor, setSelectedFloor] = useState('')
  const [acUnitNumber, setAcUnitNumber] = useState('')
  const [issueTitle, setIssueTitle] = useState('')
  const [description, setDescription] = useState('')

  // Attachment state
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')

  const [touched, setTouched] = useState({ client: false, floor: false, title: false })
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
          const clients = res.data.clients || []
          
          // Determine initial client
          let initialClientId = ''
          if (isClient && user?.client) {
            initialClientId = user.client
          } else if (clients.length > 0) {
            initialClientId = clients[0].id
          }

          setSelectedClientId(initialClientId)

          // Determine initial single floor
          const activeClientObj = clients.find((c) => c.id === initialClientId)
          if (activeClientObj?.occupied_floors?.length > 0) {
            setSelectedFloor(activeClientObj.occupied_floors[0])
          } else {
            setSelectedFloor('1F')
          }
        })
        .catch((err) => console.error('Error fetching aux data:', err))

      // Reset form
      setIssueTitle('')
      setDescription('')
      setAcUnitNumber('')
      setSelectedFile(null)
      setPreviewUrl('')
      setTouched({ client: false, floor: false, title: false })
      setError(null)
    }
  }, [open, isClient, user])

  // Active client object
  const currentClient = auxData.clients?.find((c) => c.id === selectedClientId)
  const availableFloors = currentClient?.occupied_floors?.length > 0
    ? currentClient.occupied_floors
    : ['1F', '2F', '3F']

  // Update floor when client changes
  const handleClientChange = (clientId) => {
    setSelectedClientId(clientId)
    setTouched((t) => ({ ...t, client: true }))
    const clientObj = auxData.clients?.find((c) => c.id === clientId)
    if (clientObj?.occupied_floors?.length > 0) {
      if (!clientObj.occupied_floors.includes(selectedFloor)) {
        setSelectedFloor(clientObj.occupied_floors[0])
      }
    } else {
      setSelectedFloor('1F')
    }
  }

  // File selection
  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('Image must be smaller than 10MB.')
        return
      }
      setSelectedFile(file)
      setPreviewUrl(URL.createObjectURL(file))
      setError(null)
    }
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
    setPreviewUrl('')
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
    setTouched((t) => ({ ...t, title: true }))
  }

  // Validation
  const isFormValid = Boolean(
    selectedClientId &&
    selectedFloor &&
    issueTitle.trim()
  )

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Trigger touched state on all required inputs
    setTouched({ client: true, floor: true, title: true })

    if (!selectedClientId) {
      setError('Please select a client.')
      return
    }
    if (!selectedFloor) {
      setError('Please select a floor.')
      return
    }
    if (!issueTitle.trim()) {
      setError('Issue title is required.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      // 1. Upload file if selected
      let uploadedImageUrl = ''
      if (selectedFile) {
        const formData = new FormData()
        formData.append('file', selectedFile)
        const uploadRes = await client.post('/ticketing/upload/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        uploadedImageUrl = uploadRes.data.file_url
      }

      // 2. Submit ticket
      const payload = {
        client: selectedClientId,
        title: issueTitle.trim(),
        description: description.trim(),
        floors: [selectedFloor],
        ac_unit_number: acUnitNumber.trim(),
        image_url: uploadedImageUrl,
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
          borderRadius: { xs: 2.5, sm: 3 },
          m: { xs: 1.5, sm: 2 },
          maxHeight: { xs: '92vh', sm: '90vh' },
          bgcolor: theme.palette.background.paper,
          border: `1px solid ${theme.palette.divider}`,
        },
      }}
    >
      <form onSubmit={handleSubmit} data-testid="ticket-form">
        <DialogTitle
          component="div"
          sx={{
            p: { xs: 2, sm: 2.5 },
            borderBottom: `1px solid ${theme.palette.divider}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Typography component="div" variant="h6" sx={{ fontWeight: 800, color: 'text.primary', fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
            Create New Ticket
          </Typography>
          <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Stack spacing={2.5}>
            {error && <Alert severity="error">{error}</Alert>}

            {/* 1. Client Selectable Dropdown (Single Select) */}
            <FormControl
              size="small"
              fullWidth
              required
              error={Boolean(touched.client && !selectedClientId)}
            >
              <InputLabel id="client-select-label">Client*</InputLabel>
              <Select
                labelId="client-select-label"
                value={selectedClientId}
                onChange={(e) => handleClientChange(e.target.value)}
                label="Client*"
                inputProps={{ 'data-testid': 'ticket-client-select' }}
              >
                {auxData.clients?.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name} ({c.property_name})
                  </MenuItem>
                ))}
              </Select>
              {touched.client && !selectedClientId ? (
                <FormHelperText error>Please select a client office.</FormHelperText>
              ) : (
                <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5, display: 'block' }}>
                  Select the client office experiencing the issue.
                </Typography>
              )}
            </FormControl>

            {/* 2. Floor Selection (Strict Single Select) */}
            <FormControl
              size="small"
              fullWidth
              required
              error={Boolean(touched.floor && !selectedFloor)}
            >
              <InputLabel id="floor-select-label">Floor*</InputLabel>
              <Select
                labelId="floor-select-label"
                value={selectedFloor}
                onChange={(e) => {
                  setSelectedFloor(e.target.value)
                  setTouched((t) => ({ ...t, floor: true }))
                }}
                label="Floor*"
                inputProps={{ 'data-testid': 'ticket-floor-select' }}
              >
                {availableFloors.map((floor) => (
                  <MenuItem key={floor} value={floor}>
                    Floor {floor}
                  </MenuItem>
                ))}
              </Select>
              {touched.floor && !selectedFloor ? (
                <FormHelperText error>Please select a floor.</FormHelperText>
              ) : (
                <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5, display: 'block' }}>
                  Select the exact single floor where this issue occurred.
                </Typography>
              )}
            </FormControl>

            {/* 3. Optional Asset / Device Unique Identifier */}
            <TextField
              label="Asset / Device ID (Optional)"
              fullWidth
              size="small"
              placeholder="e.g. MON-02, PRN-4F, AC-01, DSK-14"
              value={acUnitNumber}
              onChange={(e) => setAcUnitNumber(e.target.value)}
              inputProps={{ 'data-testid': 'ticket-asset-input' }}
              helperText="Optional asset tag, device ID, or equipment serial number"
            />

            {/* 4. Quick Issues Pills - Tap to autofill */}
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
                        color: isSelected ? '#FFFFFF' : 'text.primary',
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

            {/* 5. Issue Title Input */}
            <TextField
              label="Issue(s)*"
              required
              fullWidth
              size="small"
              placeholder="Type or search issue"
              value={issueTitle}
              error={Boolean(touched.title && !issueTitle.trim())}
              helperText={touched.title && !issueTitle.trim() ? 'Issue title is required.' : ''}
              onChange={(e) => {
                setIssueTitle(e.target.value)
                if (touched.title && e.target.value.trim()) {
                  setTouched((t) => ({ ...t, title: false }))
                }
              }}
              onBlur={() => setTouched((t) => ({ ...t, title: true }))}
              inputProps={{ 'data-testid': 'ticket-issue-input' }}
            />

            {/* 6. Description Textarea */}
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

            {/* 7. Image Attachment Drop / Picker Area */}
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 0.75 }}>
                Attach Photo / Proof (Optional)
              </Typography>

              {previewUrl ? (
                <Box
                  sx={{
                    position: 'relative',
                    borderRadius: 2,
                    overflow: 'hidden',
                    border: `1px solid ${theme.palette.divider}`,
                    bgcolor: isDark ? '#1E293B' : '#F8FAFC',
                    p: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                  }}
                >
                  <Box
                    component="img"
                    src={previewUrl}
                    alt="Selected attachment"
                    sx={{
                      width: 64,
                      height: 64,
                      objectFit: 'cover',
                      borderRadius: 1.5,
                      border: `1px solid ${theme.palette.divider}`,
                    }}
                  />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', noWrap: true }}>
                      {selectedFile?.name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                      {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : ''}
                    </Typography>
                  </Box>
                  <IconButton
                    size="small"
                    onClick={handleRemoveFile}
                    color="error"
                    sx={{
                      bgcolor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2',
                      '&:hover': { bgcolor: isDark ? 'rgba(239, 68, 68, 0.25)' : '#FECACA' },
                    }}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Box>
              ) : (
                <Button
                  variant="outlined"
                  component="label"
                  size="small"
                  startIcon={<AddPhotoAlternateOutlinedIcon />}
                  sx={{
                    textTransform: 'none',
                    borderRadius: 2,
                    borderColor: theme.palette.divider,
                    color: 'text.secondary',
                    py: 1.25,
                    px: 2,
                    borderStyle: 'dashed',
                    width: '100%',
                    justifyContent: 'center',
                    fontWeight: 600,
                    fontSize: '0.8125rem',
                    '&:hover': {
                      borderColor: isDark ? '#60A5FA' : '#0F172A',
                      bgcolor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC',
                    },
                  }}
                >
                  Click to attach photo or screenshot
                  <input type="file" accept="image/*" hidden onChange={handleFileChange} />
                </Button>
              )}
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: { xs: 2, sm: 2.5 }, borderTop: `1px solid ${theme.palette.divider}` }}>
          <Button onClick={onClose} disabled={submitting} sx={{ fontWeight: 600 }}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={submitting || !isFormValid}
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
