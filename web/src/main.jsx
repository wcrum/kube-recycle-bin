import React from 'react'
import ReactDOM from 'react-dom/client'
import { ThemeProvider, CssBaseline } from '@mui/material'
import App from './App'
import { naturalTheme, naturalDarkTheme } from './theme'

// Initialize theme from localStorage
const savedTheme = localStorage.getItem('theme') || 'light'
const theme = savedTheme === 'dark' ? naturalDarkTheme : naturalTheme

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </React.StrictMode>,
)

