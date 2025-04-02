'use client'

import React, { createContext, useState, useContext, useEffect, useReducer } from 'react'
import { getAudioFiles, saveAudioFiles } from './utils/audioStorage'

export type AudioFile = {
  id: string;
  name: string;
  metadata?: {
    title?: string;
    artist?: string;
    album?: string;
    tempo?: number;
    key?: string;
    // ... other metadata properties
  };
  // ... other properties
};

interface AppContextType {
  audioFiles: AudioFile[];
  setAudioFiles: React.Dispatch<React.SetStateAction<AudioFile[]>>
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([])

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

  return (
    <AppContext.Provider value={{ 
      audioFiles, 
      setAudioFiles
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
