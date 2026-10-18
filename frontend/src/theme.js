import { createTheme } from '@mui/material/styles'

export const getTheme = (mode = 'dark') => {
  const isDark = mode === 'dark'

  return createTheme({
    palette: {
      mode,
      primary: {
        main: isDark ? '#3B82F6' : '#0F172A',
        light: isDark ? '#60A5FA' : '#334155',
        dark: isDark ? '#1D4ED8' : '#020617',
        contrastText: '#FFFFFF',
      },
      secondary: {
        main: isDark ? '#818CF8' : '#2563EB',
        light: '#A5B4FC',
        dark: '#4F46E5',
        contrastText: '#FFFFFF',
      },
      background: {
        default: isDark ? '#0B0F19' : '#F8FAFC',
        paper: isDark ? '#111827' : '#FFFFFF',
        surface: isDark ? '#1E293B' : '#F1F5F9',
        elevated: isDark ? '#1F2937' : '#FFFFFF',
      },
      text: {
        primary: isDark ? '#F8FAFC' : '#0F172A',
        secondary: isDark ? '#94A3B8' : '#64748B',
      },
      divider: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
      success: {
        main: '#10B981',
        light: isDark ? 'rgba(16, 185, 129, 0.2)' : '#D1FAE5',
        dark: '#047857',
        contrastText: '#FFFFFF',
      },
      warning: {
        main: '#F59E0B',
        light: isDark ? 'rgba(245, 158, 11, 0.2)' : '#FEF3C7',
        dark: '#B45309',
        contrastText: '#FFFFFF',
      },
      info: {
        main: '#0EA5E9',
        light: isDark ? 'rgba(14, 165, 233, 0.2)' : '#E0F2FE',
        dark: '#0369A1',
        contrastText: '#FFFFFF',
      },
      error: {
        main: '#EF4444',
        light: isDark ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2',
        dark: '#B91C1C',
        contrastText: '#FFFFFF',
      },
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
        fontWeight: 800,
        letterSpacing: '-0.025em',
      },
      h6: {
        fontWeight: 700,
        letterSpacing: '-0.015em',
      },
      subtitle1: {
        fontWeight: 600,
        letterSpacing: '-0.01em',
      },
      subtitle2: {
        fontWeight: 600,
      },
      button: {
        textTransform: 'none',
        fontWeight: 700,
        letterSpacing: '0.01em',
      },
    },
    shape: {
      borderRadius: 10,
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            scrollbarColor: isDark ? '#334155 #0B0F19' : '#CBD5E1 #F8FAFC',
            '&::-webkit-scrollbar, & *::-webkit-scrollbar': {
              width: 8,
              height: 8,
            },
            '&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb': {
              borderRadius: 8,
              backgroundColor: isDark ? '#334155' : '#CBD5E1',
            },
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            boxShadow: 'none',
            padding: '8px 16px',
            '&:hover': {
              boxShadow: isDark ? '0 4px 12px rgba(0, 0, 0, 0.4)' : '0 2px 6px rgba(0, 0, 0, 0.08)',
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
            boxShadow: isDark
              ? '0 2px 8px rgba(0, 0, 0, 0.3)'
              : '0 1px 3px rgba(15, 23, 42, 0.04)',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : '#94A3B8',
              boxShadow: isDark
                ? '0 8px 24px rgba(0, 0, 0, 0.45)'
                : '0 6px 16px rgba(15, 23, 42, 0.06)',
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
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            backgroundColor: isDark ? '#111827' : '#FFFFFF',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#CBD5E1',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: isDark ? 'rgba(255, 255, 255, 0.25)' : '#94A3B8',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: isDark ? '#60A5FA' : '#0F172A',
            },
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 14,
            backgroundImage: 'none',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #E2E8F0',
            boxShadow: isDark
              ? '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
              : '0 20px 25px -5px rgba(15, 23, 42, 0.1)',
          },
        },
      },
    },
  })
}

export const theme = getTheme('dark')
