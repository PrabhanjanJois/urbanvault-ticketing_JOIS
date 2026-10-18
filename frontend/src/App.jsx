import React from 'react'
import { Box } from '@mui/material'
import { ColorModeProvider } from './context/ColorModeContext'
import { AuthProvider } from './context/AuthContext'
import { Navbar } from './components/Navbar'
import { TicketsDashboard } from './pages/TicketsDashboard'

function App() {
  return (
    <ColorModeProvider>
      <AuthProvider>
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', flexDirection: 'column' }}>
          <Navbar />
          <Box component="main" sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <TicketsDashboard />
          </Box>
        </Box>
      </AuthProvider>
    </ColorModeProvider>
  )
}

export default App
