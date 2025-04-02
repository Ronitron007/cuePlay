import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  
  // Verify state to prevent CSRF attacks
  // In a real app, you'd compare with the state stored in the session
  if (!code || !state) {
    return NextResponse.redirect(new URL('/?error=invalid_callback', request.url))
  }

  try {
    const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET
    const redirectUri = new URL('/api/spotify/callback', request.url).toString()
    
    if (!clientId || !clientSecret) {
      throw new Error('Missing Spotify credentials')
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
      },
      body: new URLSearchParams({
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    })

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange code for token')
    }

    const tokenData = await tokenResponse.json()
    const expiresAt = Date.now() + tokenData.expires_in * 1000

    // Store tokens in cookies
    cookies().set('spotify_access_token', tokenData.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: tokenData.expires_in,
      path: '/'
    })
    
    cookies().set('spotify_refresh_token', tokenData.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/'
    })
    
    cookies().set('spotify_expires_at', expiresAt.toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: tokenData.expires_in,
      path: '/'
    })

    // Redirect back to the main page
    return NextResponse.redirect(new URL('/?auth=success', request.url))
  } catch (error) {
    console.error('Error during Spotify authentication:', error)
    return NextResponse.redirect(new URL('/?error=auth_failed', request.url))
  }
} 