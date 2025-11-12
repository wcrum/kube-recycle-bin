import React from 'react'
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Box,
  Typography,
} from '@mui/material'
import { Visibility as VisibilityIcon, Restore as RestoreIcon } from '@mui/icons-material'

function RecycleItemsTable({ items, onViewYAML, onRestore }) {
  const formatAge = (ageString) => {
    const match = ageString.match(/(\d+h)?(\d+m)?(\d+s)?/)
    if (!match) return ageString

    const parts = []
    if (match[1]) parts.push(match[1].replace('h', 'h'))
    if (match[2]) parts.push(match[2].replace('m', 'm'))
    if (match[3]) parts.push(match[3].replace('s', 's'))

    return parts.join(' ') || ageString
  }

  return (
    <Paper sx={{ boxShadow: 2 }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6">Recycle Items</Typography>
      </Box>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Object Key</TableCell>
              <TableCell>API Version</TableCell>
              <TableCell>Kind</TableCell>
              <TableCell>Namespace</TableCell>
              <TableCell>Age</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.name} hover>
                <TableCell>{item.name}</TableCell>
                <TableCell>{item.objectKey}</TableCell>
                <TableCell>{item.objectAPIVersion}</TableCell>
                <TableCell>{item.objectKind}</TableCell>
                <TableCell>{item.objectNamespace || '(cluster)'}</TableCell>
                <TableCell>{formatAge(item.age)}</TableCell>
                <TableCell align="right">
                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<VisibilityIcon />}
                      onClick={() => onViewYAML(item)}
                    >
                      View YAML
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      color="success"
                      startIcon={<RestoreIcon />}
                      onClick={() => onRestore(item)}
                    >
                      Restore
                    </Button>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  )
}

export default RecycleItemsTable

