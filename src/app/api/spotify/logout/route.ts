import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST() {
  // Clear all Spotify-related cookies
  cookies().delete('spotify_access_token')
  cookies().delete('spotify_refresh_token')
  cookies().delete('spotify_expires_at')
  
  return NextResponse.json({ success: true })
} 