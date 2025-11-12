import React from 'react'
import { Box, Typography } from '@mui/material'
import { Delete as DeleteIcon } from '@mui/icons-material'

function EmptyState() {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 8,
        textAlign: 'center',
      }}
    >
      <DeleteIcon sx={{ fontSize: 96, color: 'primary.main', opacity: 0.5, mb: 2 }} />
      <Typography variant="h5" gutterBottom>
        No recycle items found
      </Typography>
      <Typography variant="body1" color="text.secondary">
        The recycle bin is empty
      </Typography>
    </Box>
  )
}

export default EmptyState

