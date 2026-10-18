import { createTheme } from '@mui/material/styles'

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#0F172A', // Slate 900 - sleek corporate UrbanVault navy
      light: '#334155',
      dark: '#020617',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#2563EB', // Blue 600 - action buttons
      light: '#60A5FA',
      dark: '#1D4ED8',
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#F8FAFC', // Slate 50
      paper: '#FFFFFF',
    },
    text: {
      primary: '#0F172A',
      secondary: '#64748B',
    },
    success: {
      main: '#10B981',
      light: '#D1FAE5',
      dark: '#047857',
    },
    warning: {
      main: '#F59E0B',
      light: '#FEF3C7',
      dark: '#B45309',
    },
    info: {
      main: '#0284C7',
      light: '#E0F2FE',
      dark: '#0369A1',
    },
    divider: '#E2E8F0',
  },
  typography: {
    fontFamily: [
      'Inter',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      'sans-serif',
    ].join(','),
    h5: {
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    h6: {
      fontWeight: 600,
      letterSpacing: '-0.01em',
    },
    subtitle1: {
      fontWeight: 600,
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            borderColor: '#CBD5E1',
            boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          borderRadius: 6,
        },
      },
    },
  },
})
