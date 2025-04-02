import { NextRequest, NextResponse } from 'next/server'
import { writeFile } from 'fs/promises'
import { join } from 'path'
import { v4 as uuidv4 } from 'uuid'
import { parseStringPromise } from 'xml2js'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('xmlFile') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    
    // Read the file content
    const fileContent = await file.text()
    
    // Parse the XML content
    const result = await parseStringPromise(fileContent, {
      explicitArray: false,
      mergeAttrs: true
    })
    
    // Extract tracks based on common XML structures from DJ software
    let tracks = []
    
    // Try to detect the XML format and extract tracks accordingly
    if (result.DJ_PLAYLISTS) {
      // Rekordbox XML format
      console.log('Detected Rekordbox XML format')
      tracks = extractRekordboxTracks(result)
    } else if (result.NML) {
      // Traktor XML format
      console.log('Detected Traktor XML format')
      tracks = extractTraktorTracks(result)
    } else if (result.SeratoLibrary) {
      // Serato XML format
      console.log('Detected Serato XML format')
      tracks = extractSeratoTracks(result)
    } else {
      // Generic approach - try to find any track-like elements
      console.log('Unknown XML format, trying generic extraction')
      tracks = extractGenericTracks(result)
    }
    
    return NextResponse.json({ 
      success: true, 
      tracks,
      format: detectXmlFormat(result)
    })
  } catch (error) {
    console.error('Error processing XML file:', error)
    return NextResponse.json({ 
      error: 'Failed to process XML file',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Helper function to detect XML format
function detectXmlFormat(xmlObj) {
  if (xmlObj.DJ_PLAYLISTS) return 'Rekordbox'
  if (xmlObj.NML) return 'Traktor'
  if (xmlObj.SeratoLibrary) return 'Serato'
  return 'Unknown'
}

// Extract tracks from Rekordbox XML
function extractRekordboxTracks(xmlObj) {
  const tracks = []
  
  try {
    const collection = xmlObj.DJ_PLAYLISTS.COLLECTION
    if (collection && collection.TRACK) {
      const trackList = Array.isArray(collection.TRACK) ? collection.TRACK : [collection.TRACK]
      
      trackList.forEach(track => {
        tracks.push({
          title: track.Name || '',
          artist: track.Artist || '',
          album: track.Album || '',
          genre: track.Genre || '',
          bpm: parseFloat(track.AverageBpm) || null,
          key: track.Tonality || track.Key || null,
          location: track.Location || '',
          duration: track.TotalTime || null,
          rating: track.Rating || null,
          year: track.Year || null,
          comment: track.Comments || null,
          energy: track.Energy || null
        })
      })
    }
  } catch (error) {
    console.error('Error extracting Rekordbox tracks:', error)
  }
  
  return tracks
}

// Extract tracks from Traktor XML
function extractTraktorTracks(xmlObj) {
  const tracks = []
  
  try {
    const collection = xmlObj.NML.COLLECTION
    if (collection && collection.ENTRY) {
      const trackList = Array.isArray(collection.ENTRY) ? collection.ENTRY : [collection.ENTRY]
      
      trackList.forEach(entry => {
        const info = entry.INFO || {}
        const location = entry.LOCATION || {}
        const tempo = entry.TEMPO || {}
        const musicalKey = entry.MUSICAL_KEY || {}
        
        tracks.push({
          title: info.TITLE || '',
          artist: info.ARTIST || '',
          album: info.ALBUM || '',
          genre: info.GENRE || '',
          bpm: parseFloat(tempo.BPM) || null,
          key: musicalKey.VALUE || null,
          location: `${location.VOLUME}${location.DIR}${location.FILE}`,
          duration: info.PLAYTIME || null,
          rating: info.RANKING || null,
          year: info.RELEASE_DATE || null,
          comment: info.COMMENT || null
        })
      })
    }
  } catch (error) {
    console.error('Error extracting Traktor tracks:', error)
  }
  
  return tracks
}

// Extract tracks from Serato XML
function extractSeratoTracks(xmlObj) {
  const tracks = []
  
  try {
    const songs = xmlObj.SeratoLibrary.Songs
    if (songs && songs.Song) {
      const trackList = Array.isArray(songs.Song) ? songs.Song : [songs.Song]
      
      trackList.forEach(song => {
        tracks.push({
          title: song.Title || '',
          artist: song.Artist || '',
          album: song.Album || '',
          genre: song.Genre || '',
          bpm: parseFloat(song.Bpm) || null,
          key: song.Key || null,
          location: song.Path || song.Location || '',
          duration: song.Length || null,
          rating: song.Rating || null,
          year: song.Year || null,
          comment: song.Comment || null
        })
      })
    }
  } catch (error) {
    console.error('Error extracting Serato tracks:', error)
  }
  
  return tracks
}

// Generic track extraction - try to find any track-like elements
function extractGenericTracks(xmlObj) {
  const tracks = []
  
  try {
    // Recursively search for objects that look like tracks
    const findTracks = (obj, path = '') => {
      if (!obj || typeof obj !== 'object') return
      
      // Check if this object looks like a track
      if (
        (obj.title || obj.Title || obj.name || obj.Name) &&
        (
          obj.artist || obj.Artist ||
          obj.bpm || obj.Bpm || obj.tempo || obj.Tempo ||
          obj.key || obj.Key
        )
      ) {
        tracks.push({
          title: obj.title || obj.Title || obj.name || obj.Name || '',
          artist: obj.artist || obj.Artist || '',
          album: obj.album || obj.Album || '',
          genre: obj.genre || obj.Genre || '',
          bpm: parseFloat(obj.bpm || obj.Bpm || obj.tempo || obj.Tempo) || null,
          key: obj.key || obj.Key || null,
          location: obj.location || obj.Location || obj.path || obj.Path || '',
          duration: obj.duration || obj.Duration || obj.length || obj.Length || null,
          rating: obj.rating || obj.Rating || null,
          year: obj.year || obj.Year || null,
          comment: obj.comment || obj.Comment || obj.comments || obj.Comments || null
        })
        return
      }
      
      // Recursively search in arrays and objects
      Object.keys(obj).forEach(key => {
        const value = obj[key]
        const newPath = path ? `${path}.${key}` : key
        
        if (Array.isArray(value)) {
          value.forEach((item, index) => {
            if (item && typeof item === 'object') {
              findTracks(item, `${newPath}[${index}]`)
            }
          })
        } else if (value && typeof value === 'object') {
          findTracks(value, newPath)
        }
      })
    }
    
    findTracks(xmlObj)
  } catch (error) {
    console.error('Error extracting generic tracks:', error)
  }
  
  return tracks
} 