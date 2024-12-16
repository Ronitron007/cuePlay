'use client'

import React from 'react'
import { useAppContext } from '../context/AppContext'
import parseCue from '../context/utils/cueParsing'
import { ICueSheet } from 'better-cue-parser/lib/types'




const DirectorySelector: React.FC = () => {
  const { setCueFiles } = useAppContext()

  const handleSelectDirectory = async () => {
    try {
      if(window !== undefined) {
      // @ts-expect-error //fuck off
      const dirHandle = await window.showDirectoryPicker()
      const cueFiles: ICueSheet[] = []

      const traverseDirectory = async (dirHandle: FileSystemDirectoryHandle, path = '') => {
        console.log(dirHandle)
        // @ts-expect-error //fuck off
        for await (const [_, entry] of dirHandle.entries()) {
          if (entry.kind === 'file') {
            if (entry.name.endsWith('.cue')) {
              const filex = await entry.getFile()
              const cueFileText = await filex.text()
              const cuesheet = parseCue(cueFileText)
              cueFiles.push(cuesheet)
            }
          } else if (entry.kind === 'directory') {
            await traverseDirectory(entry, `${path}${entry.name}/`)
          }
        }
        return ;
      }
      await traverseDirectory(dirHandle)
      setCueFiles(cueFiles!)
    }
    } catch (error) {
      console.error('Error selecting directory:', error)
    }
  }



  return (
    <button onClick={handleSelectDirectory}>Select Directory</button>
  )
}

export default DirectorySelector

