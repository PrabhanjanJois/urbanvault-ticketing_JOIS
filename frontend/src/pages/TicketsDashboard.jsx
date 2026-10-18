import React, { useState, useEffect, useCallback } from 'react'
import {
  Container,
  Box,
  Typography,
  Tabs,
  Tab,
  Button,
  Stack,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Pagination,
  Paper,
  Chip,
  Grid,
  useTheme,
  useMediaQuery,
  Dialog,
  DialogContent,
  IconButton,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import SearchIcon from '@mui/icons-material/Search'
import RestartAltIcon from '@mui/icons-material/RestartAlt'
import CloseIcon from '@mui/icons-material/Close'
import ConfirmationNumberOutlinedIcon from '@mui/icons-material/ConfirmationNumberOutlined'
import { TicketCard } from '../components/TicketCard'
import { TicketDetailPane } from '../components/TicketDetailPane'
import { CreateTicketModal } from '../components/CreateTicketModal'
import { useAuth } from '../context/AuthContext'
import { useColorMode } from '../context/ColorModeContext'
import client from '../api/client'

export const TicketsDashboard = () => {
  const theme = useTheme()
  const { user } = useAuth()
  const { mode } = useColorMode()
  const isDark = mode === 'dark'
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  // State
  const [activeTab, setActiveTab] = useState('open') // 'open' | 'closed'
  const [tickets, setTickets] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [tabCounts, setTabCounts] = useState({ open: 0, closed: 0 })
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Selected Ticket for Split-View
  const [selectedTicketId, setSelectedTicketId] = useState(null)
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false)

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('')
  const [filterClient, setFilterClient] = useState('')
  const [filterDepartment, setFilterDepartment] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [ordering, setOrdering] = useState('-created_at')

  // Dropdown options
  const [auxData, setAuxData] = useState({ clients: [], departments: [], properties: [] })

  // Modal
  const [createModalOpen, setCreateModalOpen] = useState(false)

  // Load auxiliary filter data
  useEffect(() => {
    client
      .get('/ticketing/auxiliary-data/')
      .then((res) => setAuxData(res.data))
      .catch((err) => console.error('Error fetching aux data:', err))
  }, [])

  // Fetch paginated tickets from API
  const fetchTickets = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = {
        tab: activeTab,
        page,
        ordering,
      }
      if (searchQuery.trim()) params.search = searchQuery.trim()
      if (filterClient) params.client = filterClient
      if (filterDepartment) params.department = filterDepartment
      if (filterStatus) params.status = filterStatus

      const res = await client.get('/ticketing/tickets/', { params })
      const results = res.data.results || []
      setTickets(results)
      setTotalCount(res.data.count || 0)
      if (res.data.open_count !== undefined && res.data.closed_count !== undefined) {
        setTabCounts({ open: res.data.open_count, closed: res.data.closed_count })
      }

      // Auto-select first ticket if current selected ticket is not in results
      if (results.length > 0) {
        setSelectedTicketId((prevId) => {
          const exists = results.some((t) => t.id === prevId)
          return exists ? prevId : results[0].id
        })
      } else {
        setSelectedTicketId(null)
      }
    } catch (err) {
      console.error('Error loading tickets:', err)
      setError('Could not load tickets from server. Please verify connection.')
    } finally {
      setLoading(false)
    }
  }, [activeTab, page, ordering, searchQuery, filterClient, filterDepartment, filterStatus])

  // Trigger fetch on filter / user changes
  useEffect(() => {
    fetchTickets()
  }, [fetchTickets, user])

  // Reset page to 1 when filters change
  const handleFilterChange = (setter) => (e) => {
    setter(e.target.value)
    setPage(1)
  }

  const handleClearFilters = () => {
    setSearchQuery('')
    setFilterClient('')
    setFilterDepartment('')
    setFilterStatus('')
    setOrdering('-created_at')
    setPage(1)
  }

  const hasActiveFilters =
    Boolean(searchQuery) ||
    Boolean(filterClient) ||
    Boolean(filterDepartment) ||
    Boolean(filterStatus)

  const handleSelectTicket = (t) => {
    setSelectedTicketId(t.id)
    if (isMobile) {
      setMobileDetailOpen(true)
    }
  }

  const totalPages = Math.ceil(totalCount / pageSize) || 1

  return (
    <Box sx={{ flex: 1, py: { xs: 2, sm: 3 }, px: { xs: 2, md: 3, lg: 4 } }}>
      {/* Top Header Row matching Wireframe */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={2}
        sx={{ mb: 2.5 }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <ConfirmationNumberOutlinedIcon sx={{ fontSize: 28, color: isDark ? '#60A5FA' : '#0F172A' }} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', letterSpacing: '-0.02em', fontSize: '1.25rem' }}>
              Ticket Management
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
              Live Workspace Operations Desk • {user?.client_name ? `${user.client_name}` : user?.department_name ? `${user.department_name}` : 'Indiranagar-1317'}
            </Typography>
          </Box>
        </Stack>

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateModalOpen(true)}
          sx={{
            bgcolor: isDark ? '#3B82F6' : '#0F172A',
            '&:hover': { bgcolor: isDark ? '#2563EB' : '#1E293B' },
            px: 2.5,
            py: 1,
            fontWeight: 700,
            borderRadius: 2,
            boxShadow: isDark ? '0 0 16px rgba(59, 130, 246, 0.3)' : 'none',
          }}
        >
          Create New Ticket
        </Button>
      </Stack>

      {/* Main Two-Panel Layout (Left: Master List, Right: Detail Pane) */}
      <Grid container spacing={3} sx={{ alignItems: 'flex-start' }}>
        {/* Left Column: Tickets Master List */}
        <Grid item xs={12} md={5} lg={5}>
          {/* Controls & Tabs Panel */}
          <Paper
            elevation={0}
            sx={{
              p: 2,
              mb: 2,
              borderRadius: 3,
              border: `1px solid ${theme.palette.divider}`,
              bgcolor: theme.palette.background.paper,
            }}
          >
            {/* Tabs: Open Tickets & Closed Tickets with live counts */}
            <Box sx={{ borderBottom: `1px solid ${theme.palette.divider}`, mb: 1.5 }}>
              <Tabs
                value={activeTab}
                onChange={(e, val) => {
                  setActiveTab(val)
                  setPage(1)
                }}
                textColor="primary"
                indicatorColor="primary"
                sx={{
                  minHeight: 38,
                  '& .MuiTab-root': {
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    minHeight: 38,
                    py: 0.5,
                    px: 1.5,
                    textTransform: 'none',
                  },
                }}
              >
                <Tab label={`Open Tickets (${tabCounts.open})`} value="open" />
                <Tab label={`Closed Tickets (${tabCounts.closed})`} value="closed" />
              </Tabs>
            </Box>

            {/* Search Bar matching Wireframe */}
            <TextField
              size="small"
              placeholder="Search by ticket issue text or #..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setPage(1)
              }}
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: 'text.secondary', fontSize: 18 }} />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 1.5 }}
            />

            {/* Filter Bar matching Wireframe */}
            <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
              {/* Client Filter */}
              <FormControl size="small" sx={{ minWidth: 110, flex: 1 }}>
                <InputLabel sx={{ fontSize: '0.75rem' }}>Client</InputLabel>
                <Select
                  value={filterClient}
                  onChange={handleFilterChange(setFilterClient)}
                  label="Client"
                  sx={{ fontSize: '0.8rem' }}
                >
                  <MenuItem value="" sx={{ fontSize: '0.8rem' }}>All Clients</MenuItem>
                  {auxData.clients?.map((c) => (
                    <MenuItem key={c.id} value={c.name} sx={{ fontSize: '0.8rem' }}>
                      {c.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Department Filter */}
              <FormControl size="small" sx={{ minWidth: 120, flex: 1 }}>
                <InputLabel sx={{ fontSize: '0.75rem' }}>Department</InputLabel>
                <Select
                  value={filterDepartment}
                  onChange={handleFilterChange(setFilterDepartment)}
                  label="Department"
                  sx={{ fontSize: '0.8rem' }}
                >
                  <MenuItem value="" sx={{ fontSize: '0.8rem' }}>All Departments</MenuItem>
                  {auxData.departments?.map((d) => (
                    <MenuItem key={d.id} value={d.name} sx={{ fontSize: '0.8rem' }}>
                      {d.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Status Filter */}
              <FormControl size="small" sx={{ minWidth: 110, flex: 1 }}>
                <InputLabel sx={{ fontSize: '0.75rem' }}>Status</InputLabel>
                <Select
                  value={filterStatus}
                  onChange={handleFilterChange(setFilterStatus)}
                  label="Status"
                  sx={{ fontSize: '0.8rem' }}
                >
                  <MenuItem value="" sx={{ fontSize: '0.8rem' }}>All</MenuItem>
                  {activeTab === 'open' ? [
                    <MenuItem key="PTA" value="PENDING_TECHNICIAN_ASSIGNMENT" sx={{ fontSize: '0.75rem' }}>Pending Assignment</MenuItem>,
                    <MenuItem key="PTASS" value="PENDING_TECHNICIAN_ASSESSMENT" sx={{ fontSize: '0.75rem' }}>Pending Assessment</MenuItem>,
                    <MenuItem key="PDR" value="PENDING_DEPARTMENT_REVIEW" sx={{ fontSize: '0.75rem' }}>Pending Review</MenuItem>,
                  ] : [
                    <MenuItem key="RES" value="RESOLVED" sx={{ fontSize: '0.75rem' }}>Resolved</MenuItem>,
                    <MenuItem key="CLS" value="CLOSED" sx={{ fontSize: '0.75rem' }}>Closed</MenuItem>,
                  ]}
                </Select>
              </FormControl>

              {/* Sort Dropdown */}
              <FormControl size="small" sx={{ minWidth: 110 }}>
                <InputLabel sx={{ fontSize: '0.75rem' }}>Sort</InputLabel>
                <Select
                  value={ordering}
                  onChange={(e) => setOrdering(e.target.value)}
                  label="Sort"
                  sx={{ fontSize: '0.8rem' }}
                >
                  <MenuItem value="-created_at" sx={{ fontSize: '0.8rem' }}>Newest First</MenuItem>
                  <MenuItem value="created_at" sx={{ fontSize: '0.8rem' }}>Older First</MenuItem>
                </Select>
              </FormControl>

              {/* Reset Filters */}
              {hasActiveFilters && (
                <IconButton
                  size="small"
                  onClick={handleClearFilters}
                  sx={{
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: 1.5,
                    p: 0.8,
                  }}
                >
                  <RestartAltIcon fontSize="small" />
                </IconButton>
              )}
            </Stack>
          </Paper>

          {/* Cards List Section */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {loading ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6 }}>
              <CircularProgress size={32} sx={{ mb: 1.5 }} />
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Fetching tickets...
              </Typography>
            </Box>
          ) : tickets.length === 0 ? (
            <Paper
              elevation={0}
              sx={{
                py: 6,
                px: 2,
                textAlign: 'center',
                borderRadius: 3,
                border: `1px dashed ${theme.palette.divider}`,
                bgcolor: theme.palette.background.paper,
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
                No tickets found
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 2 }}>
                {hasActiveFilters
                  ? 'No tickets match the selected filters.'
                  : `No ${activeTab} tickets in your workspace queue.`}
              </Typography>
              {hasActiveFilters && (
                <Button variant="outlined" size="small" onClick={handleClearFilters}>
                  Clear Filters
                </Button>
              )}
            </Paper>
          ) : (
            <Box sx={{ maxHeight: { md: 'calc(100vh - 220px)' }, overflowY: { md: 'auto' }, pr: { md: 1 } }}>
              {tickets.map((t) => (
                <TicketCard
                  key={t.id}
                  ticket={t}
                  onView={handleSelectTicket}
                  isSelected={t.id === selectedTicketId}
                />
              ))}

              {/* Server-Side Pagination */}
              {totalPages > 1 && (
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{ pt: 1.5, pb: 2, borderTop: `1px solid ${theme.palette.divider}` }}
                >
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                    Page {page} of {totalPages}
                  </Typography>
                  <Pagination
                    count={totalPages}
                    page={page}
                    onChange={(e, val) => setPage(val)}
                    color="primary"
                    size="small"
                    shape="rounded"
                  />
                </Stack>
              )}
            </Box>
          )}
        </Grid>

        {/* Right Column: Ticket Detail Pane (Wireframe Accurate Desktop Split Layout) */}
        {!isMobile && (
          <Grid item md={7} lg={7} sx={{ position: 'sticky', top: 80, height: 'calc(100vh - 120px)' }}>
            <TicketDetailPane
              ticketId={selectedTicketId}
              onTicketUpdated={() => fetchTickets()}
            />
          </Grid>
        )}
      </Grid>

      {/* Mobile Drawer/Modal for Ticket Details */}
      {isMobile && (
        <Dialog
          open={mobileDetailOpen}
          onClose={() => setMobileDetailOpen(false)}
          fullWidth
          maxWidth="md"
          PaperProps={{
            sx: {
              height: '90vh',
              maxHeight: '90vh',
              borderRadius: 3,
            },
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 1, bgcolor: theme.palette.background.paper }}>
            <IconButton onClick={() => setMobileDetailOpen(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
          <DialogContent sx={{ p: 0, height: '100%' }}>
            <TicketDetailPane
              ticketId={selectedTicketId}
              onTicketUpdated={() => {
                fetchTickets()
              }}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Create Ticket Modal */}
      <CreateTicketModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onTicketCreated={() => {
          fetchTickets()
        }}
      />
    </Box>
  )
}
