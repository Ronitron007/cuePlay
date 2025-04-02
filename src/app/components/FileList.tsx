'use client'

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { AudioFile, useAppContext } from '../context/AppContext'
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
  ViewList
} from '@mui/icons-material'
import FileCarousel from './FileCarousel'
import TrackTable from './TrackTable'
import Fuse from 'fuse.js'
import { useDebounce } from 'use-debounce'

// Add these types and state variables after the other state declarations
type SortKey = 'key' | 'tempo' | 'title' | 'duration' | 'artist';
type SortDirection = 'asc' | 'desc';

// Add appropriate type for your audio file


const FileList: React.FC = () => {
  const { audioFiles, setAudioFiles, spotifyTokens } = useAppContext()
  const [currentFileId, setCurrentFileId] = useState<string | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [tempoRange, setTempoRange] = useState<[number, number]>([0, 300])
  const [showFilters, setShowFilters] = useState(false)
  const [includeFilesWithoutTempo, setIncludeFilesWithoutTempo] = useState(true)
  const [primarySort, setPrimarySort] = useState<SortKey>('key');
  const [secondarySort, setSecondarySort] = useState<SortKey>('tempo');
  const [primarySortDirection, setPrimarySortDirection] = useState<SortDirection>('asc');
  const [secondarySortDirection, setSecondarySortDirection] = useState<SortDirection>('asc');
  const [viewMode, setViewMode] = useState<'carousel' | 'table'>('carousel');
  const theme = useTheme()
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(100);
  const [debouncedSearch] = useDebounce(searchInput, 300);

  useEffect(() => {
    if (audioFiles.some(file => !file.id)) {
      setAudioFiles((prevFiles: AudioFile[]) => 
        prevFiles.map((file: AudioFile) => ({
          ...file,
          id: file.id || `file-${Math.random().toString(36).substr(2, 9)}-${Date.now()}`
        }))
      );
    }
  }, [audioFiles, setAudioFiles])


  useEffect(() => {
    if (audioFiles.length > 0 && !currentFileId) {
      setCurrentFileId(audioFiles[0].id)
    }
  }, [audioFiles, currentFileId])


  const tempoLimits = useMemo(() => {
    const tempos = audioFiles
      .map(file => file?.metadata?.tempo)
      .filter(tempo => typeof tempo === 'number' && !isNaN(tempo))
    
    return {
      min: Math.floor(Math.min(...tempos, 60)),
      max: Math.ceil(Math.max(...tempos, 180))
    }
  }, [audioFiles])


  useEffect(() => {
    setTempoRange([tempoLimits.min, tempoLimits.max])
  }, [tempoLimits])


  const getSortedFiles = useCallback((files: AudioFile[]) => {
    return [...files].sort((a, b) => {
      // Helper function to get sort value based on key
      const getSortValue = (file: AudioFile, sortKey: SortKey) => {
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
  }, [primarySort, secondarySort, primarySortDirection, secondarySortDirection]);

  const filterFiles = useCallback((files: AudioFile[]) => {
    // Filter by tempo
    return files.filter(file => {
      const tempo = file?.metadata?.tempo;
      
      // Handle files without tempo data based on checkbox
      if (!tempo) {
        return includeFilesWithoutTempo;
      }
      
      // Filter files with tempo data by range
      return tempo >= tempoRange[0] && tempo <= tempoRange[1];
    });
  }, [tempoRange, includeFilesWithoutTempo]);

  const filteredFiles = useMemo(() => {
    // First apply filter
    const tempoFiltered = filterFiles(audioFiles);
    
    // Then apply search only if needed
    if (!debouncedSearch.trim()) return getSortedFiles(tempoFiltered);
    
    // Search logic with Fuse.js
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
    
    const results = fuseInstance.search(debouncedSearch);
    return getSortedFiles(results.map(result => result.item));
  }, [audioFiles, debouncedSearch, filterFiles, getSortedFiles]);

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
    setSearchInput('')
  }


  const handleTempoChange = (event: Event, newValue: number | number[]) => {
    setTempoRange(newValue as [number, number])
  }


  const handleResetFilters = () => {
    setSearchInput('')
    setTempoRange([tempoLimits.min, tempoLimits.max])
    setIncludeFilesWithoutTempo(true)
  }


  const toggleFilters = () => {
    setShowFilters(prev => !prev)
  }


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


  const fetchSpotifyMetadata = async (file: AudioFile) => {
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
          if (confirm(`Best match: "${track.name}" by ${track.artists.map((a: {name: string}) => a.name).join(', ')}...`)) {
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
          setAudioFiles((prevFiles: AudioFile[]) => {
            return prevFiles.map((f: AudioFile) => {
              if (f.id === file.id) {
                return {
                  ...f,
                  metadata: {
                    ...f.metadata,
                    title: track.name,
                    artist: track.artists.map((a: {name: string}) => a.name).join(', '),
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
            setAudioFiles((prevFiles: AudioFile[]) => {
              return prevFiles.map((f: AudioFile) => {
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

  // Get paginated data
  const paginatedFiles = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return filteredFiles.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredFiles, page, rowsPerPage]);

  if (audioFiles.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="body1">No audio files available</Typography>
      </Box>
    )
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
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
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
          endAdornment: searchInput && (
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
      {(searchInput || tempoRange[0] > tempoLimits.min || tempoRange[1] < tempoLimits.max || !includeFilesWithoutTempo) && (
        <Box sx={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: 1, 
          mb: 2, 
          width: '100%',
          justifyContent: 'flex-start'
        }}>
          {searchInput && (
            <Chip 
              label={`Search: "${searchInput}"`}
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
            <FileCarousel 
              filteredFiles={filteredFiles}
              currentFileId={currentFileId}
              handlePrevious={handlePrevious}
              handleNext={handleNext}
              handleFileClick={handleFileClick}
              fetchSpotifyMetadata={fetchSpotifyMetadata}
              spotifyTokens={spotifyTokens}
            />
          ) : (
            <TrackTable
              filteredFiles={filteredFiles}
              currentFileId={currentFileId}
              handleTableRowClick={handleTableRowClick}
              fetchSpotifyMetadata={fetchSpotifyMetadata}
              spotifyTokens={spotifyTokens}
            />
          )}
          
          <Typography sx={{ mt: 2 }} variant="body2" >
            {filteredFiles.length > 0 ? `${currentFileInfo.index + 1} of ${filteredFiles.length}` : 'No results'}
            {(searchInput || tempoRange[0] > tempoLimits.min || tempoRange[1] < tempoLimits.max) && 
              filteredFiles.length > 0 && ` (filtered from ${audioFiles.length})`}
          </Typography>
        </>
      )}
    </Box>
  )
}

export default FileList

