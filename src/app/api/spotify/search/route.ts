import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import stringSimilarity from 'string-similarity'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q')
  const originalTitle = searchParams.get('title') || ''
  const originalArtist = searchParams.get('artist') || ''
  
  if (!query) {
    return NextResponse.json({ error: 'Missing search query' }, { status: 400 })
  }
  
  // Get access token from cookies
  const cookieStore = cookies()
  const accessToken = cookieStore.get('spotify_access_token')?.value
  
  if (!accessToken) {
    return NextResponse.json({ error: 'Not authenticated with Spotify' }, { status: 401 })
  }
  
  try {
    // Call Spotify Search API
    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=${encodeURIComponent("track,artist")}&limit=5`, 
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    )
    
    if (!response.ok) {
      // If token expired, we should handle refresh in the middleware or check-auth endpoint
      if (response.status === 401) {
        return NextResponse.json({ error: 'Spotify token expired' }, { status: 401 })
      }
      
      throw new Error(`Spotify API error: ${response.status}`)
    }
    
    const data = await response.json()
    
    // If we have original title/artist, score the results for similarity
    if (originalTitle || originalArtist) {
      const scoredTracks = data.tracks.items.map(track => {
        let score = 0
        const maxScore = (originalTitle ? 1 : 0) + (originalArtist ? 1 : 0)
        
        // Calculate title similarity if original title exists
        if (originalTitle) {
          const titleSimilarity = stringSimilarity.compareTwoStrings(
            originalTitle.toLowerCase(),
            track.name.toLowerCase()
          )
          score += titleSimilarity
        }
        
        // Calculate artist similarity if original artist exists
        if (originalArtist) {
          // Get all artist names from the track
          const artistNames = track.artists.map(a => a.name.toLowerCase()).join(' ')
          const artistSimilarity = stringSimilarity.compareTwoStrings(
            originalArtist.toLowerCase(),
            artistNames
          )
          score += artistSimilarity
        }
        
        // Normalize score to be between 0 and 1
        const normalizedScore = maxScore > 0 ? score / maxScore : 0
        
        return {
          ...track,
          matchScore: normalizedScore
        }
      })
      
      // Sort by match score (highest first)
      scoredTracks.sort((a, b) => b.matchScore - a.matchScore)
      
      // Return the scored and sorted tracks
      return NextResponse.json({
        ...data,
        tracks: {
          ...data.tracks,
          items: scoredTracks
        }
      })
    }
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error searching Spotify:', error)
    return NextResponse.json({ error: 'Failed to search Spotify' }, { status: 500 })
  }
} 