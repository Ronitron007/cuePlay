'use client'

import { AppProvider } from './context/AppContext'
import DirectorySelector from './components/DirectorySelector'
import FileList from './components/FileList'

export default function Home() {
  return (
    <AppProvider>
      <main className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">.cue File Finder</h1>
        <DirectorySelector />
        <div className="mt-4">
          <FileList />
        </div>
      </main>
    </AppProvider>
  )
}

