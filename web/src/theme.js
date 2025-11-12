import { createTheme } from '@mui/material/styles'

// Natural color palette
const naturalColors = {
  primary: {
    main: '#6B8E5A',
    light: '#8FA67F',
    dark: '#5A7A4A',
  },
  secondary: {
    main: '#A67C5A',
    light: '#C99D7A',
    dark: '#8B6B4A',
  },
  error: {
    main: '#B85C4A',
    light: '#D9846B',
    dark: '#A04A38',
  },
  success: {
    main: '#6B8E5A',
    light: '#8FA67F',
    dark: '#5A7A4A',
  },
  background: {
    default: '#FDFBF8',
    paper: '#F5F1EB',
  },
  text: {
    primary: '#2B2823',
    secondary: '#3D3A35',
  },
}

const naturalDarkColors = {
  primary: {
    main: '#8FA67F',
    light: '#A6BA98',
    dark: '#7A9370',
  },
  secondary: {
    main: '#C99D7A',
    light: '#D9B298',
    dark: '#B8875C',
  },
  error: {
    main: '#D9846B',
    light: '#E8A088',
    dark: '#C66A57',
  },
  success: {
    main: '#8FA67F',
    light: '#A6BA98',
    dark: '#7A9370',
  },
  background: {
    default: '#1F1D1A',
    paper: '#2B2823',
  },
  text: {
    primary: '#F5F1EB',
    secondary: '#E8E1D5',
  },
}

export const naturalTheme = createTheme({
  palette: naturalColors,
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 20,
          padding: '10px 24px',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 4px rgba(45, 40, 35, 0.1)',
        },
      },
    },
  },
})

export const naturalDarkTheme = createTheme({
  palette: {
    mode: 'dark',
    ...naturalDarkColors,
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 20,
          padding: '10px 24px',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
        },
      },
    },
  },
})

