import React, { useState, useEffect } from 'react'
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Typography,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  IconButton,
} from '@mui/material'
import {
  Add as AddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material'

const API_BASE = '/api/v1'

function RecyclePoliciesPage() {
  const [policies, setPolicies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedPolicy, setSelectedPolicy] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    group: '',
    resource: '',
    namespaces: '',
  })

  const loadPolicies = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`${API_BASE}/recycle-policies`)
      if (!response.ok) {
        throw new Error(`Failed to load recycle policies: ${response.statusText}`)
      }
      const data = await response.json()
      setPolicies(data.policies || [])
    } catch (err) {
      setError(err.message)
      console.error('Error loading recycle policies:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPolicies()
  }, [])

  const handleCreatePolicy = async () => {
    try {
      const namespacesArray = formData.namespaces
        ? formData.namespaces.split(',').map(ns => ns.trim()).filter(ns => ns)
        : []

      const response = await fetch(`${API_BASE}/recycle-policies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          group: formData.group || undefined,
          resource: formData.resource,
          namespaces: namespacesArray,
        }),
      })

      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(`Failed to create policy: ${errorData}`)
      }

      setCreateDialogOpen(false)
      setFormData({ name: '', group: '', resource: '', namespaces: '' })
      loadPolicies()
    } catch (err) {
      console.error('Error creating policy:', err)
      setError(err.message)
    }
  }

  const handleDeletePolicy = async () => {
    if (!selectedPolicy) return

    try {
      const response = await fetch(`${API_BASE}/recycle-policies/${selectedPolicy.name}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(`Failed to delete policy: ${errorData}`)
      }

      setDeleteDialogOpen(false)
      setSelectedPolicy(null)
      loadPolicies()
    } catch (err) {
      console.error('Error deleting policy:', err)
      setError(err.message)
    }
  }

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
    <>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Paper sx={{ boxShadow: 2 }}>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Recycle Policies</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateDialogOpen(true)}
              size="small"
            >
              Create Policy
            </Button>
          </Box>
          {policies.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                No recycle policies found. Create one to start recycling resources.
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Group</TableCell>
                    <TableCell>Resource</TableCell>
                    <TableCell>Namespaces</TableCell>
                    <TableCell>Age</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {policies.map((policy) => (
                    <TableRow key={policy.name} hover>
                      <TableCell>{policy.name}</TableCell>
                      <TableCell>{policy.group || '(empty)'}</TableCell>
                      <TableCell>{policy.resource}</TableCell>
                      <TableCell>
                        {policy.namespaces && policy.namespaces.length > 0 ? (
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                            {policy.namespaces.map((ns) => (
                              <Chip key={ns} label={ns} size="small" />
                            ))}
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            (all namespaces)
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>{formatAge(policy.age)}</TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => {
                            setSelectedPolicy(policy)
                            setDeleteDialogOpen(true)
                          }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}

      {/* Create Policy Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Recycle Policy</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField
              label="Name"
              required
              fullWidth
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              helperText="Unique name for the policy"
            />
            <TextField
              label="Group"
              fullWidth
              value={formData.group}
              onChange={(e) => setFormData({ ...formData, group: e.target.value })}
              helperText="API group (e.g., 'apps', 'batch'). Leave empty for core resources."
            />
            <TextField
              label="Resource"
              required
              fullWidth
              value={formData.resource}
              onChange={(e) => setFormData({ ...formData, resource: e.target.value })}
              helperText="Resource name (e.g., 'deployments', 'pods', 'services')"
            />
            <TextField
              label="Namespaces"
              fullWidth
              value={formData.namespaces}
              onChange={(e) => setFormData({ ...formData, namespaces: e.target.value })}
              helperText="Comma-separated list of namespaces (e.g., 'default,production'). Leave empty for all namespaces."
              placeholder="default,production"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreatePolicy}
            disabled={!formData.name || !formData.resource}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Policy</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete policy <strong>{selectedPolicy?.name}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDeletePolicy}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default RecyclePoliciesPage

