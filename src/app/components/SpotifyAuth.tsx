'use client'

import { useState, useEffect } from 'react'
import { useSpotify } from '../hooks/useSpotify'

const SpotifyAuth = () => {
  const { isAuthenticated, handleLogin, handleLogout, isLoading } = useSpotify()
  
  return (
    <div className="mb-6 p-4 border rounded-md bg-gray-50">
      <h2 className="text-xl font-semibold mb-2 text-[#000]">Spotify Integration</h2>
      {isAuthenticated ? (
        <div>
          <p className="text-green-600 mb-2">✓ Connected to Spotify</p>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : 'Disconnect from Spotify'}
          </button>
        </div>
      ) : (
        <div>
          <p className="mb-2">Connect to Spotify to fetch metadata for your music files.</p>
          <button
            onClick={handleLogin}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition"
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : 'Connect to Spotify'}
          </button>
        </div>
      )}
    </div>
  )
}

export default SpotifyAuth