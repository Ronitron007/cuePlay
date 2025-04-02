import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const trackId = params.id
  console.log(trackId,"trasdfsadfasackId+")
  if (!trackId) {
    return NextResponse.json({ error: 'Missing track ID' }, { status: 400 })
  }
  
  // Get access token from cookies
  const cookieStore = cookies()
  const accessToken = cookieStore.get('spotify_access_token')?.value
  
  if (!accessToken) {
    return NextResponse.json({ error: 'Not authenticated with Spotify' }, { status: 401 })
  }
  console.log(trackId,"aaaaaaaa+")
  try {
    // Call Spotify Audio Features API
    console.log(trackId,"trackId+")
    const response = await fetch(
      `https://api.spotify.com/v1/audio-features/${trackId}`, 
      {
        headers: {
            'Authorization': `Bearer ${accessToken}`
          }
      }
    )
    
    if (!response.ok) {
      if (response.status === 401) {
        return NextResponse.json({ error: 'Spotify token expired' }, { status: 401 })
      }
      console.log(response,"response+")
      throw new Error(`Spotify API error: ${response.status} ${Object.keys(response).join(", ")}`)
    }
    
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching audio features:', error)
    return NextResponse.json({ error: 'Failed to fetch audio features' }, { status: 500 })
  }
} 