'use client'

import React, { useRef } from 'react'
import { SpotifyTokens } from '../hooks/useSpotify'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper,
  Box,
  Typography,
  IconButton,
  Tooltip,
  useTheme
} from '@mui/material'
import { MusicNote, OpenInNew } from '@mui/icons-material'

interface TrackTableProps {
  filteredFiles: any[]
  currentFileId: string | null
  handleTableRowClick: (fileId: string, file: any) => void
  fetchSpotifyMetadata: (file: any) => void
  spotifyTokens: SpotifyTokens
}

const TrackTable: React.FC<TrackTableProps> = ({
  filteredFiles,
  currentFileId,
  handleTableRowClick,
  fetchSpotifyMetadata,
  spotifyTokens
}) => {
  const theme = useTheme()
  // Add a ref for the selected table row
  const selectedRowRef = useRef<HTMLTableRowElement | null>(null)

  // Format duration (if available)
  const formatDuration = (seconds: number) => {
    if (!seconds) return '--:--'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <TableContainer 
      component={Paper} 
      sx={{ 
        maxHeight: 600,
        my: 0,
        boxShadow: theme.shadows[2],
        borderRadius: theme.shape.borderRadius,
        '&::-webkit-scrollbar': {
          width: '8px',
          height: '8px',
        },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: theme.palette.divider,
          borderRadius: '4px',
        },
        '&::-webkit-scrollbar-track': {
          backgroundColor: theme.palette.background.paper,
        }
      }}
    >
      <Table stickyHeader size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 'bold', width: '40px' }}>#</TableCell>
            <TableCell sx={{ fontWeight: 'bold', width: '50px' }}>Cover</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Title</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Artist</TableCell>
            <TableCell sx={{ fontWeight: 'bold', width: '80px' }}>
              <Tooltip title="Musical Key">
                <span>Key</span>
              </Tooltip>
            </TableCell>
            <TableCell sx={{ fontWeight: 'bold', width: '80px' }}>
              <Tooltip title="Tempo (Beats Per Minute)">
                <span>BPM</span>
              </Tooltip>
            </TableCell>
            <TableCell sx={{ fontWeight: 'bold', width: '100px' }}>Duration</TableCell>
            <TableCell sx={{ fontWeight: 'bold', width: '80px' }}>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredFiles.map((file, index) => {
            const isSelected = file.id === currentFileId
            
            return (
              <TableRow 
                key={file.id}
                hover
                selected={isSelected}
                onClick={() => handleTableRowClick(file.id, file)}
                ref={isSelected ? selectedRowRef : null}
                sx={{ 
                  cursor: 'pointer',
                  backgroundColor: isSelected ? `${theme.palette.primary.main}15` : 'inherit',
                  '&:hover': {
                    backgroundColor: isSelected 
                      ? `${theme.palette.primary.main}25` 
                      : theme.palette.action.hover
                  }
                }}
              >
                <TableCell>{index + 1}</TableCell>
                <TableCell>
                  <Box 
                    sx={{ 
                      width: 40, 
                      height: 40, 
                      borderRadius: '4px',
                      overflow: 'hidden',
                      backgroundColor: theme.palette.grey[200]
                    }}
                  >
                    {file?.metadata?.spotifyAlbumArt ? (
                      <img 
                        src={file.metadata.spotifyAlbumArt} 
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : file?.metadata?.picture ? (
                      <img 
                        src={file.metadata.picture} 
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <MusicNote 
                        sx={{ 
                          width: '100%', 
                          height: '100%', 
                          p: 1, 
                          color: theme.palette.text.secondary 
                        }} 
                      />
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography 
                    variant="body2" 
                    noWrap 
                    sx={{ 
                      fontWeight: isSelected ? 'bold' : 'normal',
                      maxWidth: 200
                    }}
                  >
                    {file?.metadata?.title || file?.name || 'Unknown'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography 
                    variant="body2" 
                    color="text.secondary" 
                    noWrap
                    sx={{ maxWidth: 150 }}
                  >
                    {file?.metadata?.artist || 'Unknown artist'}
                  </Typography>
                </TableCell>
                <TableCell>
                  {file?.metadata?.key !== undefined ? (
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: theme.palette.primary.main,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: `${theme.palette.primary.main}15`,
                        border: `1px solid ${theme.palette.primary.main}30`,
                        display: 'inline-block',
                        textAlign: 'center'
                      }}
                    >
                      {file.metadata.key}
                    </Typography>
                  ) : (
                    <Typography variant="body2" color="text.disabled">--</Typography>
                  )}
                </TableCell>
                <TableCell>
                  {file?.metadata?.tempo ? (
                    <Typography variant="body2">{Math.round(file.metadata.tempo)}</Typography>
                  ) : (
                    <Typography variant="body2" color="text.disabled">--</Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {formatDuration(file?.metadata?.duration)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Tooltip title="Find on Spotify">
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        fetchSpotifyMetadata(file);
                      }}
                      disabled={!spotifyTokens}
                      sx={{ color: theme.palette.primary.main }}
                    >
                      <MusicNote fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  {file?.metadata?.spotifyUrl && (
                    <Tooltip title="Open in Spotify">
                      <IconButton
                        size="small"
                        component="a"
                        href={file.metadata.spotifyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        sx={{ color: '#1DB954' }} 
                      >
                        <OpenInNew fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

export default TrackTable