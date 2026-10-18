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
  IconButton,
  Tooltip,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import SearchIcon from '@mui/icons-material/Search'
import FilterListIcon from '@mui/icons-material/FilterList'
import RestartAltIcon from '@mui/icons-material/RestartAlt'
import SwapVertIcon from '@mui/icons-material/SwapVert'
import { TicketCard } from '../components/TicketCard'
import { CreateTicketModal } from '../components/CreateTicketModal'
import { TicketDetailModal } from '../components/TicketDetailModal'
import { useAuth } from '../context/AuthContext'
import client from '../api/client'

export const TicketsDashboard = () => {
  const { user } = useAuth()

  // State
  const [activeTab, setActiveTab] = useState('open') // 'open' | 'closed'
  const [tickets, setTickets] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('')
  const [filterClient, setFilterClient] = useState('')
  const [filterDepartment, setFilterDepartment] = useState('')
  const [filterFM, setFilterFM] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [ordering, setOrdering] = useState('-created_at')

  // Dropdown options
  const [auxData, setAuxData] = useState({ clients: [], departments: [], properties: [] })

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedTicketId, setSelectedTicketId] = useState(null)

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
      if (filterFM) params.facility_manager = filterFM
      if (filterStatus) params.status = filterStatus

      const res = await client.get('/ticketing/tickets/', { params })
      setTickets(res.data.results || [])
      setTotalCount(res.data.count || 0)
    } catch (err) {
      console.error('Error loading tickets:', err)
      setError('Could not load tickets from server. Please verify connection.')
    } finally {
      setLoading(false)
    }
  }, [activeTab, page, ordering, searchQuery, filterClient, filterDepartment, filterFM, filterStatus])

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
    setFilterFM('')
    setFilterStatus('')
    setOrdering('-created_at')
    setPage(1)
  }

  const hasActiveFilters =
    Boolean(searchQuery) ||
    Boolean(filterClient) ||
    Boolean(filterDepartment) ||
    Boolean(filterFM) ||
    Boolean(filterStatus)

  const handleViewTicket = (t) => {
    setSelectedTicketId(t.id)
    setDetailModalOpen(true)
  }

  const totalPages = Math.ceil(totalCount / pageSize) || 1

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Top Header Row */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
            Ticketing Management
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748B', mt: 0.5 }}>
            Manage and track workspace issues across all UrbanVault locations.
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateModalOpen(true)}
          sx={{
            bgcolor: '#0F172A',
            '&:hover': { bgcolor: '#1E293B' },
            px: 2.5,
            py: 1,
            fontWeight: 700,
            borderRadius: 2,
          }}
        >
          Create New Ticket
        </Button>
      </Stack>

      {/* Tabs & Controls Section */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 3,
          borderRadius: 3,
          border: '1px solid #E2E8F0',
          backgroundColor: '#FFFFFF',
        }}
      >
        {/* Open vs Closed Tabs */}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'stretch', sm: 'center' }}
          spacing={2}
          sx={{ borderBottom: '1px solid #E2E8F0', pb: 1.5, mb: 2 }}
        >
          <Tabs
            value={activeTab}
            onChange={(e, val) => {
              setActiveTab(val)
              setPage(1)
            }}
            textColor="primary"
            indicatorColor="primary"
            sx={{
              minHeight: 40,
              '& .MuiTab-root': {
                fontWeight: 700,
                fontSize: '0.95rem',
                minHeight: 40,
                textTransform: 'none',
              },
            }}
          >
            <Tab label="Open Tickets" value="open" />
            <Tab label="Closed Tickets" value="closed" />
          </Tabs>

          <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>
            {totalCount} {activeTab === 'open' ? 'Open' : 'Closed'} Tickets Found
          </Typography>
        </Stack>

        {/* Filter Bar */}
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems="center">
            {/* Search Input */}
            <TextField
              size="small"
              placeholder="Search by issue text or ticket #..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setPage(1)
              }}
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: '#94A3B8', fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}
              sx={{ bgcolor: '#F8FAFC', borderRadius: 2 }}
            />

            {/* Sort Dropdown */}
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Sort Time</InputLabel>
              <Select
                value={ordering}
                onChange={(e) => setOrdering(e.target.value)}
                label="Sort Time"
                sx={{ bgcolor: '#F8FAFC' }}
              >
                <MenuItem value="-created_at">Newest First</MenuItem>
                <MenuItem value="created_at">Older First</MenuItem>
              </Select>
            </FormControl>
          </Stack>

          {/* Additional Filter Dropdowns */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} flexWrap="wrap" alignItems="center">
            {/* Client Filter */}
            <FormControl size="small" sx={{ minWidth: 150, flex: 1 }}>
              <InputLabel>Client</InputLabel>
              <Select
                value={filterClient}
                onChange={handleFilterChange(setFilterClient)}
                label="Client"
                sx={{ bgcolor: '#F8FAFC' }}
              >
                <MenuItem value="">All Clients</MenuItem>
                {auxData.clients?.map((c) => (
                  <MenuItem key={c.id} value={c.name}>
                    {c.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Department Filter */}
            <FormControl size="small" sx={{ minWidth: 160, flex: 1 }}>
              <InputLabel>Department</InputLabel>
              <Select
                value={filterDepartment}
                onChange={handleFilterChange(setFilterDepartment)}
                label="Department"
                sx={{ bgcolor: '#F8FAFC' }}
              >
                <MenuItem value="">All Departments</MenuItem>
                {auxData.departments?.map((d) => (
                  <MenuItem key={d.id} value={d.id}>
                    {d.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Status Filter */}
            <FormControl size="small" sx={{ minWidth: 160, flex: 1 }}>
              <InputLabel>Ticket Status</InputLabel>
              <Select
                value={filterStatus}
                onChange={handleFilterChange(setFilterStatus)}
                label="Ticket Status"
                sx={{ bgcolor: '#F8FAFC' }}
              >
                <MenuItem value="">All Statuses</MenuItem>
                {activeTab === 'open' ? (
                  <>
                    <MenuItem value="PENDING_TECHNICIAN_ASSIGNMENT">Pending Technician Assignment</MenuItem>
                    <MenuItem value="PENDING_TECHNICIAN_ASSESSMENT">Pending Technician Assessment</MenuItem>
                    <MenuItem value="PENDING_DEPARTMENT_REVIEW">Pending Department POC Review</MenuItem>
                  </>
                ) : (
                  <>
                    <MenuItem value="RESOLVED">Resolved</MenuItem>
                    <MenuItem value="CLOSED">Closed</MenuItem>
                  </>
                )}
              </Select>
            </FormControl>

            {/* Reset Filters Button */}
            {hasActiveFilters && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<RestartAltIcon />}
                onClick={handleClearFilters}
                sx={{ height: 40, px: 2, fontWeight: 700, borderColor: '#CBD5E1', color: '#475569' }}
              >
                Clear
              </Button>
            )}
          </Stack>
        </Stack>
      </Paper>

      {/* Tickets List Section */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8 }}>
          <CircularProgress size={36} sx={{ color: '#0F172A', mb: 2 }} />
          <Typography variant="body2" sx={{ color: '#64748B' }}>
            Loading tickets...
          </Typography>
        </Box>
      ) : tickets.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            py: 8,
            px: 3,
            textAlign: 'center',
            borderRadius: 3,
            border: '1px dashed #CBD5E1',
            bgcolor: '#FFFFFF',
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#334155', mb: 1 }}>
            No tickets found
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748B', maxWidth: 400, mx: 'auto', mb: 2.5 }}>
            {hasActiveFilters
              ? 'No tickets match the selected filters or search terms. Try clearing filters.'
              : `There are currently no ${activeTab} tickets in your workspace queue.`}
          </Typography>
          {hasActiveFilters && (
            <Button variant="outlined" size="small" onClick={handleClearFilters}>
              Clear All Filters
            </Button>
          )}
        </Paper>
      ) : (
        <Box>
          {tickets.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} onView={handleViewTicket} />
          ))}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              justifyContent="space-between"
              alignItems="center"
              spacing={2}
              sx={{ mt: 3, pt: 2, borderTop: '1px solid #E2E8F0' }}
            >
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>
                Showing {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, totalCount)} of {totalCount} records
              </Typography>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(e, val) => setPage(val)}
                color="primary"
                shape="rounded"
              />
            </Stack>
          )}
        </Box>
      )}

      {/* Modals */}
      <CreateTicketModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onTicketCreated={() => {
          fetchTickets()
        }}
      />

      <TicketDetailModal
        open={detailModalOpen}
        ticketId={selectedTicketId}
        onClose={() => {
          setDetailModalOpen(false)
          setSelectedTicketId(null)
        }}
        onTicketUpdated={() => {
          fetchTickets()
        }}
      />
    </Container>
  )
}
