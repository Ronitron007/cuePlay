'use client'

import { useState, useEffect } from 'react'
import { useAppContext } from '../context/AppContext'

const SpotifyAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const { spotifyTokens, setSpotifyTokens, clearSpotifyTokens } = useAppContext()
  
  // Generate a random string for state parameter
  const generateRandomString = (length: number) => {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let text = ''
    for (let i = 0; i < length; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length))
    }
    return text
  }

  // Handle the login process
  const handleLogin = () => {
    const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID
    if (!clientId) {
      console.error('Spotify Client ID not found')
      return
    }

    const redirectUri = typeof window !== 'undefined' 
      ? `${window.location.origin}/api/spotify/callback`
      : ''
    const state = generateRandomString(16)
    const scope = 'user-read-private user-read-email'

    // Store state in localStorage to verify when callback returns
    localStorage.setItem('spotify_auth_state', state)

    const authUrl = new URL('https://accounts.spotify.com/authorize')
    authUrl.searchParams.append('response_type', 'code')
    authUrl.searchParams.append('client_id', clientId)
    authUrl.searchParams.append('scope', scope)
    authUrl.searchParams.append('redirect_uri', redirectUri)
    authUrl.searchParams.append('state', state)

    window.location.href = authUrl.toString()
  }

  // Check if user is already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/spotify/check-auth')
        const data = await response.json()
        
        if (data.authenticated) {
          setIsAuthenticated(true)
          setSpotifyTokens({ 
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            expiresAt: data.expiresAt
          })
        }
      } catch (error) {
        console.error('Failed to check authentication status:', error)
      }
    }

    checkAuth()
  }, [setSpotifyTokens])

  // Handle logout
  const handleLogout = async () => {
    try {
      await fetch('/api/spotify/logout', { method: 'POST' })
      setIsAuthenticated(false)
      clearSpotifyTokens()
    } catch (error) {
      console.error('Failed to logout:', error)
    }
  }

  return (
    <div className="mb-6 p-4 border rounded-md bg-gray-50">
      <h2 className="text-xl font-semibold mb-2 text-[#000]">Spotify Integration</h2>
      {isAuthenticated ? (
        <div>
          <p className="text-green-600 mb-2">✓ Connected to Spotify</p>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
          >
            Disconnect from Spotify
          </button>
        </div>
      ) : (
        <div>
          <p className="mb-2">Connect to Spotify to fetch metadata for your music files.</p>
          <button
            onClick={handleLogin}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition"
          >
            Connect to Spotify
          </button>
        </div>
      )}
    </div>
  )
}

export default SpotifyAuth 