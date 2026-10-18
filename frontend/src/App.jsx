import React from 'react'
import { ThemeProvider, CssBaseline, Box } from '@mui/material'
import { theme } from './theme'
import { AuthProvider } from './context/AuthContext'
import { Navbar } from './components/Navbar'
import { TicketsDashboard } from './pages/TicketsDashboard'

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', flexDirection: 'column' }}>
          <Navbar />
          <Box component="main" sx={{ flex: 1 }}>
            <TicketsDashboard />
          </Box>
        </Box>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
