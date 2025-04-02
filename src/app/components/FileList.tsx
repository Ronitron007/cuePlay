'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useAppContext } from '../context/AppContext'
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  IconButton,
  Stack,
  useTheme,
  TextField,
  InputAdornment,
  Slider,
  Chip,
  Collapse,
  Button,
  FormControlLabel,
  Checkbox,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TableSortLabel,
  Switch,
  Tooltip
} from '@mui/material'
import { 
  KeyboardArrowLeft, 
  KeyboardArrowRight, 
  Search, 
  Clear, 
  Speed, 
  FilterList,
  ExpandMore,
  ExpandLess,
  HelpOutline,
  MusicNote,
  Refresh,
  ChevronLeft,
  ChevronRight,
  ViewCarousel,
  ViewList,
  OpenInNew
} from '@mui/icons-material'
import Fuse from 'fuse.js'

// Add these types and state variables after the other state declarations
type SortKey = 'key' | 'tempo' | 'title' | 'duration' | 'artist';
type SortDirection = 'asc' | 'desc';

const FileList: React.FC = () => {
  const { audioFiles, setAudioFiles, spotifyTokens } = useAppContext()
  const [currentFileId, setCurrentFileId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [tempoRange, setTempoRange] = useState<[number, number]>([0, 300])
  const [showFilters, setShowFilters] = useState(false)
  const [includeFilesWithoutTempo, setIncludeFilesWithoutTempo] = useState(true)
  const [primarySort, setPrimarySort] = useState<SortKey>('key');
  const [secondarySort, setSecondarySort] = useState<SortKey>('tempo');
  const [primarySortDirection, setPrimarySortDirection] = useState<SortDirection>('asc');
  const [secondarySortDirection, setSecondarySortDirection] = useState<SortDirection>('asc');
  const [viewMode, setViewMode] = useState<'carousel' | 'table'>('carousel');
  const theme = useTheme()

  // Generate unique IDs for files if they don't have one
  useEffect(() => {
    if (audioFiles.some(file => !file.id)) {
      setAudioFiles(prevFiles => 
        prevFiles.map(file => ({
          ...file,
          id: file.id || `file-${Math.random().toString(36).substr(2, 9)}-${Date.now()}`
        }))
      )
    }
  }, [audioFiles, setAudioFiles])

  // Set initial current file when files load
  useEffect(() => {
    if (audioFiles.length > 0 && !currentFileId) {
      setCurrentFileId(audioFiles[0].id)
    }
  }, [audioFiles, currentFileId])

  // Calculate tempo limits from all files
  const tempoLimits = useMemo(() => {
    const tempos = audioFiles
      .map(file => file?.metadata?.tempo)
      .filter(tempo => typeof tempo === 'number' && !isNaN(tempo))
    
    return {
      min: Math.floor(Math.min(...tempos, 60)),
      max: Math.ceil(Math.max(...tempos, 180))
    }
  }, [audioFiles])

  // Tempo filter state
  useEffect(() => {
    setTempoRange([tempoLimits.min, tempoLimits.max])
  }, [tempoLimits])

  // Add this function to handle sorting
  const getSortedFiles = (files: typeof audioFiles) => {
    return [...files].sort((a, b) => {
      // Helper function to get sort value based on key
      const getSortValue = (file: typeof audioFiles[0], sortKey: SortKey) => {
        switch (sortKey) {
          case 'key':
            // Extract numeric part for proper numeric sorting
            const aKeyNum = parseInt(file?.metadata?.key?.match(/\d+/)?.[0] || '0', 10);
            const aKeyMode = file?.metadata?.key?.slice(-1).toUpperCase() || '';
            // Return a composite value for proper sorting (number * 10 + mode value)
            return aKeyNum * 10 + (aKeyMode === 'B' ? 1 : 0);
          case 'tempo':
            return file?.metadata?.tempo || 0;
          case 'title':
            return file?.metadata?.title || file?.name || '';
          case 'duration':
            return file?.metadata?.duration || 0;
          case 'artist':
            return file?.metadata?.artist || '';
          default:
            return 0;
        }
      };

      // Get primary sort values
      const aPrimary = getSortValue(a, primarySort);
      const bPrimary = getSortValue(b, primarySort);
      
      // Apply primary sort direction
      const primaryMultiplier = primarySortDirection === 'asc' ? 1 : -1;
      
      // Compare primary values
      if (aPrimary < bPrimary) return -1 * primaryMultiplier;
      if (aPrimary > bPrimary) return 1 * primaryMultiplier;
      
      // If primary values are equal, use secondary sort
      const aSecondary = getSortValue(a, secondarySort);
      const bSecondary = getSortValue(b, secondarySort);
      
      // Apply secondary sort direction
      const secondaryMultiplier = secondarySortDirection === 'asc' ? 1 : -1;
      
      // Compare secondary values
      if (aSecondary < bSecondary) return -1 * secondaryMultiplier;
      if (aSecondary > bSecondary) return 1 * secondaryMultiplier;
      
      // If both are equal, sort by name as final tiebreaker
      return (a?.name || '').localeCompare(b?.name || '');
    });
  };

  // Modify the filteredFiles useMemo to include sorting
  const filteredFiles = useMemo(() => {
    // First filter by tempo
    const tempoFiltered = audioFiles.filter(file => {
      const tempo = file?.metadata?.tempo;
      
      // Handle files without tempo data based on checkbox
      if (!tempo) {
        return includeFilesWithoutTempo;
      }
      
      // Filter files with tempo data by range
      return tempo >= tempoRange[0] && tempo <= tempoRange[1];
    });
    
    // Then apply text search if needed
    let searchFiltered = tempoFiltered;
    if (searchQuery.trim()) {
      const fuseInstance = new Fuse(tempoFiltered, {
        keys: [
          'name',
          'metadata.title',
          'metadata.artist',
          'metadata.album'
        ],
        threshold: 0.4,
        includeScore: true
      });
      
      const results = fuseInstance.search(searchQuery);
      searchFiltered = results.map(result => result.item);
    }
    
    // Finally, apply sorting
    return getSortedFiles(searchFiltered);
  }, [
    audioFiles, 
    searchQuery, 
    tempoRange, 
    includeFilesWithoutTempo, 
    primarySort, 
    secondarySort, 
    primarySortDirection, 
    secondarySortDirection
  ]);

  // Reset current file when filtered files change
  useEffect(() => {
    if (filteredFiles.length > 0) {
      // If current file is not in filtered list, select first filtered file
      if (!currentFileId || !filteredFiles.some(file => file.id === currentFileId)) {
        setCurrentFileId(filteredFiles[0].id)
      }
    } else {
      setCurrentFileId(null)
    }
  }, [filteredFiles, currentFileId])

  // Get current file and its index
  const currentFileInfo = useMemo(() => {
    if (!currentFileId || filteredFiles.length === 0) return { file: null, index: -1 }
    
    const index = filteredFiles.findIndex(file => file.id === currentFileId)
    return {
      file: index >= 0 ? filteredFiles[index] : null,
      index: index
    }
  }, [filteredFiles, currentFileId])

  const handlePrevious = () => {
    if (filteredFiles.length === 0) return
    
    const currentIndex = currentFileInfo.index
    const newIndex = currentIndex <= 0 ? filteredFiles.length - 1 : currentIndex - 1
    setCurrentFileId(filteredFiles[newIndex].id)
  }

  const handleNext = () => {
    if (filteredFiles.length === 0) return
    
    const currentIndex = currentFileInfo.index
    const newIndex = currentIndex >= filteredFiles.length - 1 ? 0 : currentIndex + 1
    setCurrentFileId(filteredFiles[newIndex].id)
  }

  // Handle clicking on a file
  const handleFileClick = (fileId: string) => {
    console.log(fileId, "fileId")
    setCurrentFileId(fileId)
  }

  // Clear search
  const handleClearSearch = () => {
    setSearchQuery('')
  }

  // Handle tempo range change
  const handleTempoChange = (event: Event, newValue: number | number[]) => {
    setTempoRange(newValue as [number, number])
  }

  // Reset all filters
  const handleResetFilters = () => {
    setSearchQuery('')
    setTempoRange([tempoLimits.min, tempoLimits.max])
    setIncludeFilesWithoutTempo(true)
  }

  // Toggle filters visibility
  const toggleFilters = () => {
    setShowFilters(prev => !prev)
  }

  // Setup keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        handlePrevious()
      } else if (event.key === 'ArrowRight') {
        handleNext()
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Function to fetch metadata from Spotify
  const fetchSpotifyMetadata = async (file) => {
    if (!spotifyTokens) {
      alert('Please connect to Spotify first')
      return
    }
    
    try {
      // Create a search query based on available metadata
      const editInfoSplit = (file?.metadata?.title || '').split("[")
      const titleSplit = (editInfoSplit[0]).split("(feat.") 
      const title = titleSplit[0] + (editInfoSplit.length > 1 ? (" - " + editInfoSplit[1].replace("]","")): "")
      const artist = (file?.metadata?.artist || '') + (titleSplit.length > 1 ? (", " + titleSplit[1].replace(")", "")) : '')
      let searchQuery = ''
      
      if (title && artist) {
        searchQuery = `track:${title} artist:${artist}`
      } else if (title) {
        searchQuery = `track:${title}`
      } else if (artist) {
        searchQuery = `artist:${artist}`
      } else {
        // Try to extract info from filename
        const filename = file.name.replace(/\.[^/.]+$/, "") // Remove extension
        searchQuery = filename
      }
      
      // Include original title and artist for similarity scoring
      const queryParams = new URLSearchParams({
        q: searchQuery
      })
      
      if (title) queryParams.append('title', title)
      if (artist) queryParams.append('artist', artist)
      
      const response = await fetch(`/api/spotify/search?${queryParams.toString()}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch from Spotify')
      }
      
      const data = await response.json()
      console.log(data, "data from spotify")
      let setTrack = false
      
      if (data.tracks && data.tracks.items && data.tracks.items.length > 0) {
        // Get the best match
        const track = data.tracks.items[0]
        
        // Check if the match score is good enough (if available)
        const matchThreshold = 0.6 // Adjust this threshold as needed
        if (track.matchScore !== undefined && track.matchScore < matchThreshold) {
          // If we have multiple results, show a confirmation with the top match
          if (confirm(`Best match: "${track.name}" by ${track.artists.map(a => a.name).join(', ')}\nConfidence: ${Math.round(track.matchScore * 100)}%\n\nUse this result?`)) {
            setTrack = true
          } else {
            alert('No matching tracks found on Spotify')
            return
          }
        } else {
          setTrack = true
        }
        
        // Update the file with Spotify metadata
        if (setTrack) {
          // First update with basic track info
          setAudioFiles(prevFiles => {
            return prevFiles.map(f => {
              if (f.id === file.id) {
                return {
                  ...f,
                  metadata: {
                    ...f.metadata,
                    title: track.name,
                    artist: track.artists.map(a => a.name).join(', '),
                    album: track.album.name,
                    spotifyId: track.id,
                    spotifyUri: track.uri,
                    spotifyUrl: track.external_urls.spotify,
                    spotifyAlbumArt: track.album.images[0]?.url || f.metadata?.picture,
                    // Keep existing tempo if available
                    tempo: f.metadata?.tempo || null
                  }
                }
              }
              return f
            })
          })
          
          // Then fetch audio features
          try {
            const featuresResponse = await fetch(`/api/spotify/audio-features/${track.id}`)
            if (!featuresResponse.ok) {
              throw new Error('Failed to fetch audio features')
            }
            
            const features = await featuresResponse.json()
            
            // Update with audio features
            setAudioFiles(prevFiles => {
              return prevFiles.map(f => {
                if (f.id === file.id) {
                  return {
                    ...f,
                    metadata: {
                      ...f.metadata,
                      // Only override tempo if we don't already have it
                      tempo: f.metadata?.tempo || Math.round(features.tempo),
                      key: features.key,
                      mode: features.mode,
                      timeSignature: features.time_signature,
                      danceability: features.danceability,
                      energy: features.energy,
                      acousticness: features.acousticness,
                      instrumentalness: features.instrumentalness,
                      liveness: features.liveness,
                      valence: features.valence
                    }
                  }
                }
                return f
              })
            })
          } catch (error) {
            console.error('Error fetching audio features:', error)
            // We already updated with basic info, so just log the error
          }
        }
      } else {
        alert('No matching tracks found on Spotify')
      }
    } catch (error) {
      console.error('Error fetching Spotify metadata:', error)
      alert('Error fetching Spotify metadata')
    }
  }

  // Add this function before the return statement
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

  // Add a function to toggle sort direction
  const toggleSortDirection = (sortType: 'primary' | 'secondary') => {
    if (sortType === 'primary') {
      setPrimarySortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSecondarySortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    }
  };

  // Add a function to handle sort selection
  const handleSortChange = (sortType: 'primary' | 'secondary', value: SortKey) => {
    if (sortType === 'primary') {
      // If new primary sort is the same as secondary, swap them
      if (value === secondarySort) {
        setSecondarySort(primarySort);
      }
      setPrimarySort(value);
    } else {
      // If new secondary sort is the same as primary, swap them
      if (value === primarySort) {
        setPrimarySort(secondarySort);
      }
      setSecondarySort(value);
    }
  };

  // Update the handleTableRowClick function to copy track name to clipboard
  const handleTableRowClick = (fileId: string, file: typeof audioFiles[0]) => {
    // Set the current file ID
    setCurrentFileId(fileId);
    
    // Get the track name to copy
    const trackName = file?.metadata?.title || file?.name || 'Unknown track';
    
    // Copy to clipboard
    navigator.clipboard.writeText(trackName)
      .then(() => {
        // Optional: Show a small notification that copying succeeded
        console.log(`Copied to clipboard: ${trackName}`);
        
        // You could add a small toast notification here if you have a toast system
      })
      .catch(err => {
        console.error('Failed to copy text: ', err);
      });
  };

  // Add a ref for the selected table row
  const selectedRowRef = useRef<HTMLTableRowElement | null>(null);

  // Add this useEffect to scroll the selected item into view when filteredFiles change
  useEffect(() => {
    // Check if we have a current file and it's in the filtered list
    if (currentFileId && filteredFiles.some(file => file.id === currentFileId)) {
      // For table view, use the ref to scroll
      if (viewMode === 'table' && selectedRowRef.current) {
        // Use scrollIntoView with options for smooth scrolling
        selectedRowRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }
      // For carousel view, the current item is always centered by design
    }
  }, [filteredFiles, currentFileId, viewMode]);

  if (audioFiles.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="body1">No audio files available</Typography>
      </Box>
    )
  }

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

  // Add sort indicators to the Filter Status section
  {(primarySort !== 'key' || secondarySort !== 'tempo' || 
    primarySortDirection !== 'asc' || secondarySortDirection !== 'asc') && (
    <Chip 
      label={`Sort: ${primarySort.charAt(0).toUpperCase() + primarySort.slice(1)} (${primarySortDirection === 'asc' ? '↑' : '↓'}) → ${secondarySort.charAt(0).toUpperCase() + secondarySort.slice(1)} (${secondarySortDirection === 'asc' ? '↑' : '↓'})`}
      size="small"
      onDelete={() => {
        setPrimarySort('key');
        setSecondarySort('tempo');
        setPrimarySortDirection('asc');
        setSecondarySortDirection('asc');
      }}
    />
  )}

  return (
    <Box sx={{ 
      maxWidth: '100%', 
      mx: 'auto', 
      p: 3,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      overflow: 'hidden'
    }}>
      {/* Search Bar with improved styling */}
      <TextField
        fullWidth
        variant="outlined"
        placeholder="Search by title, artist or album..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        sx={{ 
          mb: 2,
          '& .MuiOutlinedInput-root': {
            borderRadius: theme.shape.borderRadius,
            backgroundColor: theme.palette.mode === 'dark' 
              ? theme.palette.background.paper 
              : theme.palette.grey[50],
            transition: theme.transitions.create(['background-color', 'box-shadow']),
            '&:hover': {
              backgroundColor: theme.palette.mode === 'dark'
                ? theme.palette.action.hover
                : theme.palette.grey[100]
            },
            '&.Mui-focused': {
              boxShadow: `0 0 0 2px ${theme.palette.primary.main}25`,
              borderColor: theme.palette.primary.main
            }
          },
          '& .MuiInputBase-input': {
            padding: theme.spacing(1.5, 2)
          },
          '& .MuiInputAdornment-root': {
            color: theme.palette.text.secondary
          }
        }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search color="inherit" />
            </InputAdornment>
          ),
          endAdornment: searchQuery && (
            <InputAdornment position="end">
              <IconButton 
                size="small" 
                onClick={handleClearSearch}
                sx={{ 
                  color: theme.palette.text.secondary,
                  '&:hover': {
                    color: theme.palette.text.primary,
                    backgroundColor: theme.palette.action.hover
                  }
                }}
              >
                <Clear fontSize="small" />
              </IconButton>
            </InputAdornment>
          )
        }}
      />
      
      {/* Filter Toggle Button */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        width: '100%', 
        mb: 2 
      }}>
        <Button 
          startIcon={<FilterList />}
          endIcon={showFilters ? <ExpandLess /> : <ExpandMore />}
          onClick={toggleFilters}
          variant="outlined"
          size="small"
          sx={{ 
            backgroundColor: theme.palette.background.paper,
            borderColor: theme.palette.divider,
            color: theme.palette.text.secondary,
          }}
        >
          Filters
        </Button>
        
        <FormControlLabel
          control={
            <Switch
              checked={viewMode === 'table'}
              onChange={() => setViewMode(prev => prev === 'carousel' ? 'table' : 'carousel')}
              color="primary"
              size="small"
            />
          }
          label={
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Tooltip title="Carousel View">
                <ViewCarousel 
                  fontSize="small" 
                  color={viewMode === 'carousel' ? 'primary' : 'disabled'} 
                  sx={{ mr: 0.5 }}
                />
              </Tooltip>
              <Tooltip title="Table View">
                <ViewList 
                  fontSize="small" 
                  color={viewMode === 'table' ? 'primary' : 'disabled'} 
                />
              </Tooltip>
            </Box>
          }
          labelPlacement="start"
        />
      </Box>
      
      {/* Collapsible Filters Section */}
      <Collapse in={showFilters} sx={{ width: '100%', mb: 2 }}>
        <Box sx={{ 
          p: 2, 
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: theme.shape.borderRadius,
          backgroundColor: theme.palette.background.paper
        }}>
          {/* Tempo Range Slider */}
          <Box sx={{ mb: 2 }}>
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
              <Speed fontSize="small" color="action" />
              <Typography variant="body2" color="text.secondary">
                Tempo Range (BPM)
              </Typography>
              <Chip 
                label={`${tempoRange[0]} - ${tempoRange[1]} BPM`}
                size="small"
                variant="outlined"
                sx={{ ml: 'auto' }}
              />
            </Stack>
            
            <Slider
              value={tempoRange}
              onChange={handleTempoChange}
              valueLabelDisplay="auto"
              min={tempoLimits.min}
              max={tempoLimits.max}
              sx={{ mt: 1 }}
            />
            
            {/* Checkbox for files without tempo data */}
            <Box sx={{ mt: 2, display: 'flex', alignItems: 'center' }}>
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={includeFilesWithoutTempo}
                    onChange={(e) => setIncludeFilesWithoutTempo(e.target.checked)}
                    size="small"
                  />
                }
                label={
                  <Typography variant="body2" color="text.secondary">
                    Include files without tempo data
                  </Typography>
                }
              />
              <Typography 
                variant="caption" 
                color="text.secondary" 
                sx={{ ml: 1 }}
              >
                ({filteredFiles.length - filteredFiles.filter(f => f.metadata?.tempo).length} of {filteredFiles.length} files)
              </Typography>
              <IconButton 
                size="small" 
                sx={{ ml: 0.5, color: theme.palette.text.secondary }}
                title="Files without detected BPM will be excluded from tempo filtering if unchecked"
              >
                <HelpOutline fontSize="inherit" />
              </IconButton>
            </Box>
          </Box>
          
          {/* Sort Options */}
          <Box sx={{ mt: 3 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Sort Options
            </Typography>
            
            <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Primary Sort
                </Typography>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Box sx={{ flex: 1 }}>
                    <select
                      value={primarySort}
                      onChange={(e) => handleSortChange('primary', e.target.value as SortKey)}
                      style={{
                        width: '100%',
                        padding: '8px',
                        borderRadius: '4px',
                        border: `1px solid ${theme.palette.divider}`,
                        backgroundColor: theme.palette.background.paper,
                        color: theme.palette.text.primary
                      }}
                    >
                      <option value="key">Key</option>
                      <option value="tempo">Tempo</option>
                    </select>
                  </Box>
                  <IconButton 
                    size="small" 
                    onClick={() => toggleSortDirection('primary')}
                    sx={{ color: theme.palette.text.secondary }}
                  >
                    {primarySortDirection === 'asc' ? <ChevronRight /> : <ChevronLeft />}
                  </IconButton>
                </Stack>
              </Box>
              
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Secondary Sort
                </Typography>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Box sx={{ flex: 1 }}>
                    <select
                      value={secondarySort}
                      onChange={(e) => handleSortChange('secondary', e.target.value as SortKey)}
                      style={{
                        width: '100%',
                        padding: '8px',
                        borderRadius: '4px',
                        border: `1px solid ${theme.palette.divider}`,
                        backgroundColor: theme.palette.background.paper,
                        color: theme.palette.text.primary
                      }}
                    >
                      <option value="key">Key</option>
                      <option value="tempo">Tempo</option>
                      <option value="title">Alphabetical</option>
                      <option value="duration">Duration</option>
                      <option value="artist">Artist</option>
                    </select>
                  </Box>
                  <IconButton 
                    size="small" 
                    onClick={() => toggleSortDirection('secondary')}
                    sx={{ color: theme.palette.text.secondary }}
                  >
                    {secondarySortDirection === 'asc' ? <ChevronRight /> : <ChevronLeft />}
                  </IconButton>
                </Stack>
              </Box>
            </Stack>
          </Box>
          
          <Divider sx={{ my: 2 }} />
          
          {/* Reset Filters Button */}
          <Button 
            variant="text" 
            size="small" 
            onClick={handleResetFilters}
            startIcon={<Clear fontSize="small" />}
            sx={{ mt: 1 }}
          >
            Reset Filters
          </Button>
        </Box>
      </Collapse>
      
      {/* Filter Status */}
      {(searchQuery || tempoRange[0] > tempoLimits.min || tempoRange[1] < tempoLimits.max || !includeFilesWithoutTempo) && (
        <Box sx={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: 1, 
          mb: 2, 
          width: '100%',
          justifyContent: 'flex-start'
        }}>
          {searchQuery && (
            <Chip 
              label={`Search: "${searchQuery}"`}
              onDelete={handleClearSearch}
              size="small"
            />
          )}
          
          {(tempoRange[0] > tempoLimits.min || tempoRange[1] < tempoLimits.max) && (
            <Chip 
              label={`Tempo: ${tempoRange[0]}-${tempoRange[1]} BPM`}
              onDelete={() => setTempoRange([tempoLimits.min, tempoLimits.max])}
              size="small"
              icon={<Speed fontSize="small" />}
            />
          )}
          
          {!includeFilesWithoutTempo && (
            <Chip 
              label="Excluding files without tempo"
              onDelete={() => setIncludeFilesWithoutTempo(true)}
              size="small"
            />
          )}
        </Box>
      )}
      
      {filteredFiles.length === 0 ? (
        <Typography variant="body1" sx={{ my: 4 }}>
          No results found with the current filters
        </Typography>
      ) : (
        <>
          {viewMode === 'carousel' ? (
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
          ) : (
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
                    const isSelected = file.id === currentFileId;
                    
                    // Format duration (if available)
                    const formatDuration = (seconds: number) => {
                      if (!seconds) return '--:--';
                      const mins = Math.floor(seconds / 60);
                      const secs = Math.floor(seconds % 60);
                      return `${mins}:${secs.toString().padStart(2, '0')}`;
                    };
                    
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
                                color: getKeyColor(file.metadata.key),
                                padding: '2px 6px',
                                borderRadius: '4px',
                                backgroundColor: `${getKeyColor(file.metadata.key)}15`,
                                border: `1px solid ${getKeyColor(file.metadata.key)}30`,
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
                                sx={{ color: '#1DB954' }} // Spotify green
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
          )}
          
          <Typography sx={{ mt: 2 }} variant="body2" >
            {filteredFiles.length > 0 ? `${currentFileInfo.index + 1} of ${filteredFiles.length}` : 'No results'}
            {(searchQuery || tempoRange[0] > tempoLimits.min || tempoRange[1] < tempoLimits.max) && 
              filteredFiles.length > 0 && ` (filtered from ${audioFiles.length})`}
          </Typography>
        </>
      )}
    </Box>
  )
}

export default FileList

