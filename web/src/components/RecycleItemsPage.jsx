import React, { useState, useEffect } from 'react'
import {
  Box,
  Container,
  CircularProgress,
  Alert,
} from '@mui/material'
import RecycleItemsTable from './RecycleItemsTable'
import YAMLDialog from './YAMLDialog'
import RestoreDialog from './RestoreDialog'
import EmptyState from './EmptyState'

const API_BASE = '/api/v1'

function RecycleItemsPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [yamlDialogOpen, setYamlDialogOpen] = useState(false)
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)

  const loadRecycleItems = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`${API_BASE}/recycle-items`)
      if (!response.ok) {
        throw new Error(`Failed to load recycle items: ${response.statusText}`)
      }
      const data = await response.json()
      setItems(data.items || [])
    } catch (err) {
      setError(err.message)
      console.error('Error loading recycle items:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRecycleItems()
  }, [])

  const handleViewYAML = (item) => {
    setSelectedItem(item)
    setYamlDialogOpen(true)
  }

  const handleRestore = (item) => {
    setSelectedItem(item)
    setRestoreDialogOpen(true)
  }

  const handleRestoreConfirm = async () => {
    if (!selectedItem) return

    try {
      const response = await fetch(`${API_BASE}/recycle-items/${selectedItem.name}/restore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(`Failed to restore: ${errorData}`)
      }

      const data = await response.json()
      setRestoreDialogOpen(false)
      setSelectedItem(null)
      loadRecycleItems()
    } catch (err) {
      console.error('Error restoring item:', err)
      setError(err.message)
    }
  }

  return (
    <>
      {loading && (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {!loading && !error && items.length === 0 && <EmptyState />}

      {!loading && !error && items.length > 0 && (
        <RecycleItemsTable
          items={items}
          onViewYAML={handleViewYAML}
          onRestore={handleRestore}
        />
      )}

      <YAMLDialog
        open={yamlDialogOpen}
        onClose={() => {
          setYamlDialogOpen(false)
          setSelectedItem(null)
        }}
        itemName={selectedItem?.name}
      />

      <RestoreDialog
        open={restoreDialogOpen}
        onClose={() => {
          setRestoreDialogOpen(false)
          setSelectedItem(null)
        }}
        onConfirm={handleRestoreConfirm}
        itemName={selectedItem?.name}
      />
    </>
  )
}

export default RecycleItemsPage

