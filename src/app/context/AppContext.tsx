'use client'

import React, { createContext, useState, useContext, useEffect, useReducer } from 'react'
import { getAudioFiles, saveAudioFiles } from './utils/audioStorage'

// Define Spotify token type
type SpotifyTokens = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
} | null;

// Define the context type
interface AppContextType {
  audioFiles: any[];
  setAudioFiles: (files: any[]) => void;
  spotifyTokens: SpotifyTokens;
  setSpotifyTokens: (tokens: SpotifyTokens) => void;
  clearSpotifyTokens: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [audioFiles, setAudioFiles] = useState<any[]>([])
  const [spotifyTokens, setSpotifyTokens] = useState<SpotifyTokens>(null)

  useEffect(() => {
    const loadSavedFiles = async () => {
      try {
        const savedFiles = await getAudioFiles()
        if (savedFiles && savedFiles.length > 0) {
          setAudioFiles(savedFiles)
        }
      } catch (error) {
        console.error('Error loading saved audio files:', error)
      }
    }
    
    loadSavedFiles()
  }, [])

  useEffect(() => {
    saveAudioFiles(audioFiles).catch(err => 
      console.error('Error saving audio files:', err)
    )
  }, [audioFiles])



  const clearSpotifyTokens = () => {
    setSpotifyTokens(null)
  }

  return (
    <AppContext.Provider value={{ 
      audioFiles, 
      setAudioFiles,
      spotifyTokens,
      setSpotifyTokens,
      clearSpotifyTokens
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useAppContext = () => {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider')
  }
  return context
}

// Add these types to your existing types
type SpotifyTokens = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
} | null;

// Update your AppState interface to include Spotify tokens
interface AppState {
  // ... your existing state properties
  spotifyTokens: SpotifyTokens;
}

// Add these action types to your existing action types
type AppAction = 
  // ... your existing action types
  | { type: 'SET_SPOTIFY_TOKEN', payload: SpotifyTokens }
  | { type: 'CLEAR_SPOTIFY_TOKEN' }

// Update your initial state
const initialState: AppState = {
  // ... your existing initial state
  spotifyTokens: null,
};

// Update your reducer function to handle the new actions
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    // ... your existing cases
    case 'SET_SPOTIFY_TOKEN':
      return {
        ...state,
        spotifyTokens: action.payload,
      };
    case 'CLEAR_SPOTIFY_TOKEN':
      return {
        ...state,
        spotifyTokens: null,
      };
    default:
      return state;
  }
}

