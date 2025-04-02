import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  const cookieStore = cookies()
  const accessToken = cookieStore.get('spotify_access_token')?.value
  const refreshToken = cookieStore.get('spotify_refresh_token')?.value
  const expiresAt = cookieStore.get('spotify_expires_at')?.value

  if (accessToken && refreshToken && expiresAt) {
    // Check if token is expired
    if (Date.now() > parseInt(expiresAt)) {
      // Token is expired, try to refresh it
      try {
        const refreshedData = await refreshAccessToken(refreshToken)
        
        return NextResponse.json({
          authenticated: true,
          accessToken: refreshedData.accessToken,
          refreshToken: refreshedData.refreshToken,
          expiresAt: refreshedData.expiresAt
        })
      } catch (error) {
        console.error('Failed to refresh token:', error)
        return NextResponse.json({ authenticated: false })
      }
    }
    
    return NextResponse.json({
      authenticated: true,
      accessToken,
      refreshToken,
      expiresAt: parseInt(expiresAt)
    })
  }

  return NextResponse.json({ authenticated: false })
}

async function refreshAccessToken(refreshToken: string) {
  const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET
  
  if (!clientId || !clientSecret) {
    throw new Error('Missing Spotify credentials')
  }

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    })
  })

  if (!response.ok) {
    throw new Error('Failed to refresh token')
  }

  const data = await response.json()
  const expiresAt = Date.now() + data.expires_in * 1000
  
  // Update cookies with new tokens
  cookies().set('spotify_access_token', data.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: data.expires_in,
    path: '/'
  })
  
  cookies().set('spotify_expires_at', expiresAt.toString(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: data.expires_in,
    path: '/'
  })
  
  // If a new refresh token is provided, update it
  if (data.refresh_token) {
    cookies().set('spotify_refresh_token', data.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/'
    })
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    expiresAt
  }
} 