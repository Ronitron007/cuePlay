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
  selectedRowRef: React.RefObject<HTMLTableRowElement>
}

const TrackTable: React.FC<TrackTableProps> = ({
  filteredFiles,
  currentFileId,
  handleTableRowClick,
  fetchSpotifyMetadata,
  spotifyTokens,
  selectedRowRef
}) => {
  const theme = useTheme()

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
      aria-label="Music tracks table"
    >
      <Table stickyHeader size="small" role="grid">
        <caption className="sr-only">List of audio tracks with metadata</caption>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 'bold', width: '40px' }} scope="col">#</TableCell>
            <TableCell sx={{ fontWeight: 'bold', width: '50px' }} scope="col">Cover</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }} scope="col">Title</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }} scope="col">Artist</TableCell>
            <TableCell sx={{ fontWeight: 'bold', width: '80px' }} scope="col">
              <Tooltip title="Musical Key">
                <span id="column-key">Key</span>
              </Tooltip>
            </TableCell>
            <TableCell sx={{ fontWeight: 'bold', width: '80px' }} scope="col">
              <Tooltip title="Tempo (Beats Per Minute)">
                <span id="column-bpm">BPM</span>
              </Tooltip>
            </TableCell>
            <TableCell sx={{ fontWeight: 'bold', width: '100px' }} scope="col">Duration</TableCell>
            <TableCell sx={{ fontWeight: 'bold', width: '80px' }} scope="col">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredFiles.map((file, index) => {
            const isSelected = file.id === currentFileId
            const trackName = file?.metadata?.title || file?.name || 'Unknown'
            const artistName = file?.metadata?.artist || 'Unknown artist'
            
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
                aria-selected={isSelected}
                role="row"
                aria-label={`Track: ${trackName} by ${artistName}`}
              >
                <TableCell role="gridcell">{index + 1}</TableCell>
                <TableCell role="gridcell">
                  <Box 
                    component="figure"
                    sx={{ 
                      width: 40, 
                      height: 40, 
                      borderRadius: '4px',
                      overflow: 'hidden',
                      backgroundColor: theme.palette.grey[200],
                      margin: 0
                    }}
                  >
                    {file?.metadata?.spotifyAlbumArt ? (
                      <img 
                        src={file.metadata.spotifyAlbumArt} 
                        alt={`Album cover for ${trackName}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : file?.metadata?.picture ? (
                      <img 
                        src={file.metadata.picture} 
                        alt={`Album cover for ${trackName}`}
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
                        aria-hidden="true"
                      />
                    )}
                  </Box>
                </TableCell>
                <TableCell role="gridcell">
                  <Typography 
                    component="h3"
                    variant="body2" 
                    noWrap 
                    sx={{ 
                      fontWeight: isSelected ? 'bold' : 'normal',
                      maxWidth: 200
                    }}
                  >
                    {trackName}
                  </Typography>
                </TableCell>
                <TableCell role="gridcell">
                  <Typography 
                    variant="body2" 
                    color="text.secondary" 
                    noWrap
                    sx={{ maxWidth: 150 }}
                  >
                    {artistName}
                  </Typography>
                </TableCell>
                <TableCell role="gridcell" aria-labelledby="column-key">
                  {file?.metadata?.key !== undefined ? (
                    <Typography 
                      component="span"
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
                <TableCell role="gridcell" aria-labelledby="column-bpm">
                  {file?.metadata?.tempo ? (
                    <Typography variant="body2">{Math.round(file.metadata.tempo)}</Typography>
                  ) : (
                    <Typography variant="body2" color="text.disabled">--</Typography>
                  )}
                </TableCell>
                <TableCell role="gridcell">
                  <Typography variant="body2">
                    {formatDuration(file?.metadata?.duration)}
                  </Typography>
                </TableCell>
                <TableCell role="gridcell">
                  <Tooltip title="Find on Spotify">
                    <span>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          fetchSpotifyMetadata(file);
                        }}
                        disabled={!spotifyTokens}
                        sx={{ color: theme.palette.primary.main }}
                        aria-label={`Search for "${trackName}" on Spotify`}
                      >
                        <MusicNote fontSize="small" aria-hidden="true" />
                      </IconButton>
                    </span>
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
                        aria-label={`Open "${trackName}" in Spotify`}
                      >
                        <OpenInNew fontSize="small" aria-hidden="true" />
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