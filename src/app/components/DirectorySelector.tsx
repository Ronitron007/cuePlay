'use client'

import React, { useState } from 'react'
import { useAppContext } from '../context/AppContext'
import Script from 'next/script'

// We'll use the global jsmediatags object after loading it via CDN
declare global {
  interface Window {
    jsmediatags: any;
  }
}

const DirectorySelector: React.FC = () => {
  const { setAudioFiles } = useAppContext()
  const [isScriptLoaded, setIsScriptLoaded] = useState(false)

  const handleSelectDirectory = async () => {
    try {
      if(window !== undefined) {
      // @ts-expect-error //fuck off
      const dirHandle = await window.showDirectoryPicker()
      const audioFiles: any[] = []

      const traverseDirectory = async (dirHandle: FileSystemDirectoryHandle, path = '') => {
        for await (const [_, entry] of dirHandle.entries()) {
          if (entry.kind === 'file') {
            const isAudioFile = entry.name.endsWith('.m4a') || 
                               entry.name.endsWith('.mp3') || 
                               entry.name.endsWith('.flac')
            
            if (isAudioFile) {
              const file = await entry.getFile()
              const fileObj = {
                name: entry.name,
                path: `${path}${entry.name}`,
                file: file,
                type: file.type,
                size: file.size
              }
              
              // Parse metadata asynchronously
              parseMetadata(file).then(metadata => {
                if (metadata) {
                  fileObj.metadata = metadata;
                }
              }).catch(err => {
                console.error(`Error parsing metadata for ${entry.name}:`, err);
              });
              
              audioFiles.push(fileObj)
            }
          } else if (entry.kind === 'directory') {
            await traverseDirectory(entry, `${path}${entry.name}/`)
          }
        }
        return;
      }

      const parseMetadata = (file: File): Promise<any> => {
        return new Promise((resolve, reject) => {
          if (!window.jsmediatags) {
            reject(new Error('jsmediatags not loaded'));
            return;
          }
          
          window.jsmediatags.read(file, {
            onSuccess: (tag: any) => {
              const { tags } = tag;
              
              // Process picture data if available
              let pictureUrl = null;
              if (tags.picture) {
                const { data, format } = tags.picture;
                // Convert picture data (Uint8Array) to base64
                const base64String = arrayBufferToBase64(data);
                pictureUrl = `data:${format};base64,${base64String}`;
              }
              
              resolve({
                ...tags,
                title: tags.sonm && tags.sonm.data ? tags.sonm.data : tags.title,
                artist: tags.soar && tags.soar.data ? tags.soar.data : tags.artist,
                tempo: tags.tmpo && tags.tmpo.data ? tags.tmpo.data : null,
                album: tags.album,
                year: tags.year,
                picture: pictureUrl,
              });
            },
            onError: (error: any) => {
              reject(error);
            }
          });
        });
      };

      // Helper function to convert array buffer to base64
      const arrayBufferToBase64 = (buffer: Uint8Array): string => {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        
        return window.btoa(binary);
      };
      
      await traverseDirectory(dirHandle)
      console.log(audioFiles, "audioFiles")
      setAudioFiles(audioFiles)
    }
    } catch (error) {
      console.error('Error selecting directory:', error)
    }
  }

  return (
    <>
      <Script 
        src="https://cdnjs.cloudflare.com/ajax/libs/jsmediatags/3.9.5/jsmediatags.min.js"
        onLoad={() => setIsScriptLoaded(true)}
      />
      <button 
        onClick={handleSelectDirectory} 
        disabled={!isScriptLoaded}
      >
        {isScriptLoaded ? 'Select Directory' : 'Loading...'}
      </button>
    </>
  )
}

export default DirectorySelector

