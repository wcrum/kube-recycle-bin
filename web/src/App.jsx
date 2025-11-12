import React, { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom'
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  IconButton,
  Button,
  Box,
  ThemeProvider,
  CssBaseline,
  Tooltip,
  Tabs,
  Tab,
  useTheme,
} from '@mui/material'
import {
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material'
import { naturalTheme, naturalDarkTheme } from './theme'
import RecycleItemsPage from './components/RecycleItemsPage'
import RecyclePoliciesPage from './components/RecyclePoliciesPage'

function NavigationTabs() {
  const location = useLocation()
  const [value, setValue] = useState(location.pathname === '/policies' ? 1 : 0)
  const theme = useTheme()

  React.useEffect(() => {
    setValue(location.pathname === '/policies' ? 1 : 0)
  }, [location])

  return (
      <Tabs
      value={value}
      onChange={(e, newValue) => setValue(newValue)}
      sx={{ 
        borderBottom: 1, 
        borderColor: 'divider',
        '& .MuiTab-root': {
          color: 'rgba(255, 255, 255, 0.7)',
          '&.Mui-selected': {
            color: '#fff',
            fontWeight: 600,
          },
        },
        '& .MuiTabs-indicator': {
          backgroundColor: '#fff',
        },
      }}
    >
      <Tab label="Recycle Items" component={Link} to="/" />
      <Tab label="Recycle Policies" component={Link} to="/policies" />
    </Tabs>
  )
}

function AppContent() {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme') || 'light'
    return saved === 'dark' ? naturalDarkTheme : naturalTheme
  })

  const toggleTheme = () => {
    const newTheme = theme.palette.mode === 'dark' ? naturalTheme : naturalDarkTheme
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme.palette.mode === 'dark' ? 'dark' : 'light')
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <AppBar
          position="sticky"
          sx={{
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
          }}
        >
          <Toolbar>
            <DeleteIcon sx={{ mr: 2 }} />
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Kube Recycle Bin
            </Typography>
            <Tooltip title="Toggle dark mode">
              <IconButton color="inherit" onClick={toggleTheme}>
                {theme.palette.mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
              </IconButton>
            </Tooltip>
          </Toolbar>
          <NavigationTabs />
        </AppBar>

        <Container maxWidth="xl" sx={{ mt: 4, mb: 4, flex: 1 }}>
          <Routes>
            <Route path="/" element={<RecycleItemsPage />} />
            <Route path="/policies" element={<RecyclePoliciesPage />} />
          </Routes>
        </Container>
      </Box>
    </ThemeProvider>
  )
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  )
}

export default App

