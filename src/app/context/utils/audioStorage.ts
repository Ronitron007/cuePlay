// src/utils/audioStorage.ts
interface AudioMetadata {
    name: string;
    path: string;
    type: string;
    size: number;
    metadata?: {
      title?: string;
      artist?: string;
      album?: string;
      year?: number;
      picture?: string;
      duration?: number;
    };
  }
  
  const DB_NAME = 'audioLibraryDB';
  const STORE_NAME = 'audioFiles';
  const DB_VERSION = 1;
  
  const initDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'path' });
        }
      };
    });
  };
  
  export const saveAudioFiles = async (files: AudioMetadata[]): Promise<void> => {
    const db = await initDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    // Clear existing data
    store.clear();
    
    // Store new files
    files.forEach(file => {
      // Create a serializable version (remove File object)
      const serializableFile = { ...file };
      delete serializableFile.file; // Can't store File objects
      store.add(serializableFile);
    });
    
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  };
  
  export const getAudioFiles = async (): Promise<AudioMetadata[]> => {
    const db = await initDB();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  };