'use client'

import React from 'react'
import { SpotifyTokens } from '../hooks/useSpotify'
import { 
  Box, 
  Typography, 
  IconButton,
  Button,
  useTheme
} from '@mui/material'
import { 
  KeyboardArrowLeft, 
  KeyboardArrowRight,
  MusicNote
} from '@mui/icons-material'

// Define types
export type FileWithMetadata = {
  id: string;
  name: string;
  metadata?: {
    title?: string;
    artist?: string;
    album?: string;
    duration?: number;
    tempo?: number;
    key?: string;
    picture?: string;
    spotifyId?: string;
    spotifyUri?: string;
    spotifyUrl?: string;
    spotifyAlbumArt?: string;
  }
}

export interface FileCarouselProps {
  filteredFiles: FileWithMetadata[];
  currentFileId: string | null;
  handlePrevious: () => void;
  handleNext: () => void;
  handleFileClick: (fileId: string) => void;
  fetchSpotifyMetadata: (file: FileWithMetadata) => void;
  spotifyTokens: SpotifyTokens;
}

const FileCarousel: React.FC<FileCarouselProps> = ({ 
  filteredFiles, 
  currentFileId, 
  handlePrevious, 
  handleNext, 
  handleFileClick,
  fetchSpotifyMetadata,
  spotifyTokens
}) => {
  const theme = useTheme();

  // Get current file and its index
  const currentFileInfo = React.useMemo(() => {
    if (!currentFileId || filteredFiles.length === 0) return { file: null, index: -1 }
    
    const index = filteredFiles.findIndex(file => file.id === currentFileId)
    return {
      file: index >= 0 ? filteredFiles[index] : null,
      index: index
    }
  }, [filteredFiles, currentFileId]);

  // Function to get visible items with proper wrapping
  const getVisibleItems = () => {
    const items = []
    const totalFiles = filteredFiles.length
    
    if (totalFiles === 0) return items
    
    const currentIndex = currentFileInfo.index
    if (currentIndex === -1) return items
    
    const visibleCount = Math.min(21, totalFiles) // Current + 10 on each side, or fewer if not enough files
    
    for (let i = 0; i < visibleCount; i++) {
      const offset = i - Math.min(10, Math.floor(visibleCount / 2)) // Center the current item
      let index = (currentIndex + offset) % totalFiles
      if (index < 0) index += totalFiles // Handle negative indices
      
      items.push({
        file: filteredFiles[index],
        offset,
        fileId: filteredFiles[index].id
      })
    }
    
    return items
  }

  // Add this function for key colors
  const getKeyColor = (keyString: string) => {
    // If key is undefined or empty, return default color
    if (!keyString) {
      return theme.palette.text.secondary;
    }
    
    // Parse the key string - number part is the scale, letter part is the mode
    const scaleNumber = parseInt(keyString.match(/\d+/)?.[0] || '0', 10);
    const mode = keyString.slice(-1).toUpperCase(); // A for minor, B for major
    
    // Color palette for musical keys (based on the circle of fifths)
    const keyColors = {
      1: '#C40233', // C (Red)
      2: '#FFD700', // D (Yellow)
      3: '#008000', // E (Green)
      4: '#40E0D0', // F (Turquoise)
      5: '#0000FF', // G (Blue)
      6: '#8A2BE2', // A (Purple)
      7: '#FF1493', // B (Pink)
      8: '#FF8C00', // C# (Orange)
      9: '#7CFC00', // D# (Lime)
      10: '#00FFFF', // F# (Cyan)
      11: '#FF00FF', // G# (Magenta)
      12: '#FF69B4', // A# (Light Pink)
      // Default color if scale is not recognized
      0: theme.palette.text.secondary
    };
    
    // Return the color for the key scale, or default if not found
    return keyColors[scaleNumber] || keyColors[0];
  }

  return (
    <Box sx={{ 
      width: '100%',
      height: "600px",
      my: 2,
      perspective: '1200px'
    }}>
      <IconButton 
        onClick={handlePrevious} 
        size="large"
        sx={{ 
          position: 'absolute', 
          left: 0, 
          top: '50%', 
          transform: 'translateY(-50%)',
          zIndex: 10,
          backgroundColor: "#fff",
          "&:hover": {
            backgroundColor: "#ffffff",
            opacity: 0.8
          }
        }}
      >
        <KeyboardArrowLeft fontSize="large" />
      </IconButton>
      
      <Box sx={{ 
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        {getVisibleItems().map(({ file, offset, fileId }) => (
          <Box 
            key={fileId}
            onClick={() => offset !== 0 && handleFileClick(fileId)}
            sx={{ 
              position: 'absolute',
              width: "max-content",
              height: "max-content",
              transform: `
                translateX(${offset * 280}px) 
                translateZ(${-Math.abs(offset) * 50}px)
                scale(${1 - Math.abs(offset) * 0.05})
              `,
              zIndex: 10 - Math.abs(offset),
              transition: theme.transitions.create(
                ['transform', 'opacity', 'width', 'height'], 
                { duration: theme.transitions.duration.standard }
              ),
              display: 'flex',
              overflowY: 'visible',
              flexDirection: 'column',
              boxShadow: offset === 0 ? 8 : 2,
              backgroundColor: theme.palette.background.paper,
              cursor: offset !== 0 ? 'pointer' : 'default',
              '&:hover': {
                opacity: offset !== 0 ? 0.9 : 1,
                transform: offset !== 0 ? `
                  translateX(${offset * 280}px) 
                  translateZ(${-Math.abs(offset) * 50}px)
                  scale(${1 - Math.abs(offset) * 0.03})
                ` : `
                  translateX(${offset * 280}px) 
                  translateZ(${-Math.abs(offset) * 50}px)
                  scale(${1 - Math.abs(offset) * 0.05})
                `
              }
            }}
          >
            {/* Album Art - Square Container */}
            <Box 
              sx={{ 
                width: offset === 0 ? 300 : 200,
                height: offset === 0 ? 300 : 200,
                paddingTop: '100%', // This makes it square (1:1 aspect ratio)
                position: 'relative',
                backgroundColor: theme.palette.grey[100]
              }}
            >
              {file?.metadata?.spotifyAlbumArt ? (
                <img 
                  src={file.metadata.spotifyAlbumArt} 
                  alt={file.metadata?.title || file.name}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
              ) : file?.metadata?.picture ? (
                <img 
                  src={file.metadata.picture} 
                  alt={file.metadata?.title || file.name}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
              ) : (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: theme.palette.grey[200],
                    color: theme.palette.text.secondary
                  }}
                >
                  <Typography variant="body2">No Cover</Typography>
                </Box>
              )}
            </Box>
            
            {/* Audio Information */}
            <Box sx={{ 
              flexGrow: 0,
              display: offset === 0 ? 'flex' : 'none',
              width: offset === 0 ? 300 : 200,
              height: "max-content",
              flexDirection: 'column',
              justifyContent: 'center',
              position: 'absolute',
              marginTop: "300px",
              p: offset === 0 ? 2 : 1,
              backgroundColor: theme.palette.background.default,
              color: theme.palette.text.primary
            }}>
              <Typography 
                variant={offset === 0 ? "body1" : "body2"} 
                component="div"
                noWrap
                sx={{ 
                  textAlign: 'center',
                  fontWeight: offset === 0 ? 'bold' : 'normal',
                  color:"text.primary"
                }}
              >
                {file?.metadata?.title || file?.name || 'Unknown file'}
              </Typography>
              <Box sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 1
              }}>
              {offset === 0 && (
                <>
                  <Typography 
                    variant="body2" 
                    color="text.secondary" 
                    sx={{ 
                      textAlign: 'center',
                      mt: 0.5
                    }}
                  >
                    {file?.metadata?.artist || 'Unknown artist'}
                  </Typography>
                  
                  {/* Display tempo if available */}
                  {file?.metadata?.tempo && 
                    <Typography 
                      variant="caption" 
                      color="text.secondary" 
                      sx={{ 
                        fontWeight: offset === 0 ? 'bold' : 'normal',
                        textAlign: 'center',
                        mt: 0.5
                      }}
                    >
                      {file?.metadata?.tempo} BPM
                    </Typography>
                  }
                  
                  {/* Display musical key if available */}
                  {file?.metadata?.key !== undefined && 
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        fontWeight: offset === 0 ? 'bold' : 'normal',
                        textAlign: 'center',
                        mt: 0.5,
                        color: getKeyColor(file.metadata.key),
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: `${getKeyColor(file.metadata.key)}15`,
                        border: `1px solid ${getKeyColor(file.metadata.key)}30`
                      }}
                    >
                      {file.metadata.key}
                    </Typography>
                  }
                </>
              )}
              </Box>
              
              {/* Spotify button for current item */}
              {offset === 0 && (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<MusicNote />}
                  onClick={(e) => {
                    e.stopPropagation();
                    fetchSpotifyMetadata(file);
                  }}
                  disabled={!spotifyTokens}
                  sx={{ 
                    mt: 2,
                    fontSize: '0.75rem',
                    textTransform: 'none',
                    borderRadius: '16px',
                    borderColor: theme.palette.primary.main,
                    color: theme.palette.primary.main,
                    '&:hover': {
                      backgroundColor: `${theme.palette.primary.main}10`
                    }
                  }}
                >
                  {file?.metadata?.spotifyId ? 'Update from Spotify' : 'Find on Spotify'}
                </Button>
              )}
              
              {/* Display Spotify link if available */}
              {offset === 0 && file?.metadata?.spotifyUrl && (
                <Button
                  variant="text"
                  size="small"
                  href={file.metadata.spotifyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ 
                    mt: 1,
                    fontSize: '0.75rem',
                    textTransform: 'none',
                    color: '#1DB954', // Spotify green
                  }}
                >
                  Open in Spotify
                </Button>
              )}
            </Box>
          </Box>
        ))}
      </Box>
      
      <IconButton 
        onClick={handleNext} 
        size="large"
        sx={{ 
          position: 'absolute', 
          right: 0, 
          top: '50%', 
          transform: 'translateY(-50%)',
          zIndex: 10,
          backgroundColor: "#fff",
          "&:hover": {
            backgroundColor: "#ffffff",
            opacity: 0.8
          }
        }}
      >
        <KeyboardArrowRight fontSize="large" />
      </IconButton>
    </Box>
  );
};

export default FileCarousel;
