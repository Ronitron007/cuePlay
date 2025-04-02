'use client'

import React, { useState } from 'react'
import { Box, Button, Typography, CircularProgress, Alert } from '@mui/material'
import { Storage } from '@mui/icons-material'
import { useAppContext } from '../context/AppContext'

const DatabaseLoader: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const { setAudioFiles } = useAppContext()

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setLoading(true)
    setError(null)
    setSuccess(false)

    // Create a FormData object to send the file
    const formData = new FormData()
    formData.append('xmlFile', file)

    try {
      // Send the file to our API endpoint
      const response = await fetch('/api/parse-xml', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to parse XML file')
      }

      const data = await response.json()
      
      // Update audio files with the parsed data
      if (data.tracks && data.tracks.length > 0) {
        // Merge with existing files based on some identifier (e.g., filename)
        setAudioFiles(prevFiles => {
          const updatedFiles = [...prevFiles]
          
          // For each track from the XML
          data.tracks.forEach(xmlTrack => {
            // Find a matching file in our existing files
            const matchIndex = updatedFiles.findIndex(file => {
              // Try to match by filename or title
              const fileName = file.name.toLowerCase()
              const fileTitle = (file.metadata?.title || '').toLowerCase()
              const xmlTitle = (xmlTrack.title || '').toLowerCase()
              const xmlLocation = (xmlTrack.location || '').toLowerCase()
              
              // Extract just the filename from the location path
              const xmlFileName = xmlLocation.split('/').pop() || xmlLocation.split('\\').pop() || ''
              
              return fileName.includes(xmlTitle) || 
                     fileTitle.includes(xmlTitle) || 
                     fileName.includes(xmlFileName) ||
                     xmlFileName.includes(fileName)
            })
            
            if (matchIndex !== -1) {
              // Update the existing file with XML info
              updatedFiles[matchIndex] = {
                ...updatedFiles[matchIndex],
                metadata: {
                  ...updatedFiles[matchIndex].metadata,
                  // Add or update with XML values
                  tempo:  updatedFiles[matchIndex].metadata?.tempo || xmlTrack.bpm,
                  key: xmlTrack.key !== undefined ? xmlTrack.key : updatedFiles[matchIndex].metadata?.key,
                  // Add any other fields from the XML
                  genre: xmlTrack.genre || updatedFiles[matchIndex].metadata?.genre,
                  year: xmlTrack.year || updatedFiles[matchIndex].metadata?.year,
                  comment: xmlTrack.comment || updatedFiles[matchIndex].metadata?.comment,
                  energy: xmlTrack.energy || updatedFiles[matchIndex].metadata?.energy,
                }
              }
            }
          })
          
          return updatedFiles
        })
        
        setSuccess(true)
      } else {
        setError('No tracks found in the XML file')
      }
    } catch (err) {
      console.error('Error parsing XML:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box sx={{ mb: 4, p: 3, border: '1px dashed', borderRadius: 2, borderColor: 'divider' }}>
      <Typography variant="h6" gutterBottom>
        Import from XML
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Upload an XML file to import track information (BPM, key, etc.) from DJ software
      </Typography>
      
      <Button
        variant="contained"
        component="label"
        startIcon={loading ? <CircularProgress size={20} /> : <Storage />}
        disabled={loading}
        sx={{ mb: 2 }}
      >
        {loading ? 'Processing...' : 'Upload XML File'}
        <input
          type="file"
          accept=".xml"
          hidden
          onChange={handleFileUpload}
        />
      </Button>
      
      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mt: 2 }}>
          Successfully imported track information from XML
        </Alert>
      )}
    </Box>
  )
}

export default DatabaseLoader 