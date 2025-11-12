import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  IconButton,
} from '@mui/material'
import { Close as CloseIcon, ContentCopy as CopyIcon } from '@mui/icons-material'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { useTheme } from '@mui/material/styles'

const API_BASE = '/api/v1'

function YAMLDialog({ open, onClose, itemName }) {
  const [yaml, setYaml] = useState('')
  const [loading, setLoading] = useState(false)
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  useEffect(() => {
    if (open && itemName) {
      loadYAML()
    } else {
      setYaml('')
    }
  }, [open, itemName])

  const loadYAML = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE}/recycle-items/${itemName}?format=yaml`)
      if (!response.ok) {
        throw new Error(`Failed to load YAML: ${response.statusText}`)
      }
      const yamlText = await response.text()
      setYaml(yamlText)
    } catch (err) {
      setYaml(`Error: ${err.message}`)
      console.error('Error loading YAML:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(yaml)
      // You could add a snackbar notification here
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          YAML View
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box
          sx={{
            mt: 1,
            '& pre': {
              margin: 0,
              borderRadius: 1,
            },
          }}
        >
          {loading ? (
            <Box sx={{ p: 2, textAlign: 'center' }}>Loading...</Box>
          ) : (
            <SyntaxHighlighter
              language="yaml"
              style={isDark ? vscDarkPlus : oneLight}
              customStyle={{
                margin: 0,
                borderRadius: '4px',
                fontSize: '13px',
              }}
            >
              {yaml}
            </SyntaxHighlighter>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCopy} startIcon={<CopyIcon />}>
          Copy
        </Button>
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default YAMLDialog

