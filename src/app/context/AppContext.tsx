'use client'

import { ICueSheet } from 'better-cue-parser/lib/types'
import React, { createContext, useState, useContext } from 'react'

interface AppContextType {
  cueFiles: ICueSheet[]
  setCueFiles: React.Dispatch<React.SetStateAction<ICueSheet[]>>
}



const AppContext = createContext<AppContextType | undefined>(undefined)

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cueFiles, setCueFiles] = useState<ICueSheet[]>([])

  return (
    <AppContext.Provider value={{ cueFiles, setCueFiles }}>
      {children}
    </AppContext.Provider>
  )
}

export const useAppContext = () => {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error('useAppContext must arrayBuffer, keyused within an AppProvider')
  }
  return context
}

