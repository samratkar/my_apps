import { GeneratedContent } from '../types';
import JSZip from 'jszip';

export interface SavedSession {
  id: string;
  timestamp: number;
  content: GeneratedContent;
  thumbnailUrl?: string; // Base64 thumbnail
}

const DB_NAME = 'LavenderMorningDB';
const DB_VERSION = 1;
const STORE_NAME = 'sessions';

// Initialize IndexedDB
const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        objectStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
};

// Save a session
export const saveSession = async (content: GeneratedContent, thumbnailUrl?: string): Promise<string> => {
  const db = await initDB();
  const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  const session: SavedSession = {
    id: sessionId,
    timestamp: Date.now(),
    content,
    thumbnailUrl
  };
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add(session);
    
    request.onsuccess = () => resolve(sessionId);
    request.onerror = () => reject(request.error);
    
    transaction.oncomplete = () => db.close();
  });
};

// Get all sessions (sorted by timestamp, newest first)
export const getAllSessions = async (): Promise<SavedSession[]> => {
  const db = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    
    request.onsuccess = () => {
      const sessions = request.result as SavedSession[];
      sessions.sort((a, b) => b.timestamp - a.timestamp);
      resolve(sessions);
    };
    request.onerror = () => reject(request.error);
    
    transaction.oncomplete = () => db.close();
  });
};

// Get a specific session by ID
export const getSession = async (id: string): Promise<SavedSession | null> => {
  const db = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);
    
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
    
    transaction.oncomplete = () => db.close();
  });
};

// Delete a session
export const deleteSession = async (id: string): Promise<void> => {
  const db = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    
    transaction.oncomplete = () => db.close();
  });
};

// Copy text to clipboard
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    // Fallback method
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    } catch (fallbackErr) {
      console.error('Fallback copy failed:', fallbackErr);
      return false;
    }
  }
};

// Export all sessions as JSON file
export const exportAllSessionsAsJSON = async (): Promise<void> => {
  const sessions = await getAllSessions();
  
  const zip = new JSZip();
  const imagesFolder = zip.folder('images');
  
  if (!imagesFolder) {
    throw new Error('Failed to create images folder in ZIP');
  }
  
  // Process each session to extract images
  const exportSessions = await Promise.all(sessions.map(async (session, index) => {
    const sessionCopy = { ...session };
    
    // Handle main image
    if (session.content.imageSource) {
      let imageData: string;
      let imageFormat = 'jpeg';
      
      if (session.content.isOffline) {
        // For offline (URL), fetch the image
        try {
          const response = await fetch(session.content.imageSource);
          const blob = await response.blob();
          imageData = await blobToBase64(blob);
        } catch (err) {
          console.error('Failed to fetch offline image:', err);
          imageData = '';
        }
      } else {
        // For online (base64)
        imageData = session.content.imageSource;
        imageFormat = session.content.imageMimeType?.includes('png') ? 'png' : 'jpeg';
      }
      
      if (imageData) {
        const imageName = `session-${session.timestamp}-${index}.${imageFormat}`;
        // Remove data URL prefix if present
        const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
        imagesFolder.file(imageName, base64Data, { base64: true });
        
        // Update session to reference image path
        sessionCopy.content = {
          ...sessionCopy.content,
          imageSource: `images/${imageName}`,
          imageMimeType: undefined // Remove as it's in the filename
        };
      }
    }
    
    // Handle thumbnail
    if (session.thumbnailUrl) {
      const thumbnailName = `thumbnail-${session.timestamp}-${index}.jpeg`;
      const base64Data = session.thumbnailUrl.replace(/^data:image\/\w+;base64,/, '');
      imagesFolder.file(thumbnailName, base64Data, { base64: true });
      sessionCopy.thumbnailUrl = `images/${thumbnailName}`;
    }
    
    return sessionCopy;
  }));
  
  const exportData = {
    exportDate: new Date().toISOString(),
    totalSessions: sessions.length,
    sessions: exportSessions
  };
  
  // Add JSON to zip
  const jsonString = JSON.stringify(exportData, null, 2);
  zip.file('sessions.json', jsonString);
  
  // Generate and download ZIP
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(zipBlob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `lavender-morning-sessions-${Date.now()}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Helper function to convert blob to base64
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Remove data URL prefix
      resolve(result.split(',')[1] || result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// Import sessions from JSON file
export const importSessionsFromJSON = async (file: File): Promise<{ imported: number; skipped: number; errors: string[] }> => {
  return new Promise(async (resolve, reject) => {
    try {
      // Check if it's a ZIP file
      if (file.name.endsWith('.zip')) {
        const zip = new JSZip();
        const zipContent = await zip.loadAsync(file);
        
        // Read the JSON file
        const jsonFile = zipContent.file('sessions.json');
        if (!jsonFile) {
          reject(new Error('sessions.json not found in ZIP file'));
          return;
        }
        
        const jsonString = await jsonFile.async('string');
        const data = JSON.parse(jsonString);
        
        if (!data.sessions || !Array.isArray(data.sessions)) {
          reject(new Error('Invalid JSON format: missing sessions array'));
          return;
        }
        
        const db = await initDB();
        let imported = 0;
        let skipped = 0;
        const errors: string[] = [];
        
        // Process each session
        for (const session of data.sessions) {
          try {
            // Validate session structure
            if (!session.id || !session.timestamp || !session.content) {
              skipped++;
              errors.push(`Skipped invalid session: ${session.id || 'unknown'}`);
              continue;
            }
            
            // Check if session already exists
            const existingSession = await getSession(session.id);
            if (existingSession) {
              skipped++;
              continue;
            }
            
            // Restore images from ZIP
            const restoredSession = { ...session };
            
            // Restore main image
            if (session.content.imageSource && session.content.imageSource.startsWith('images/')) {
              const imagePath = session.content.imageSource;
              const imageFile = zipContent.file(imagePath);
              
              if (imageFile) {
                const imageBlob = await imageFile.async('blob');
                const imageBase64 = await blobToBase64(imageBlob);
                const imageExtension = imagePath.split('.').pop()?.toLowerCase();
                const mimeType = imageExtension === 'png' ? 'image/png' : 'image/jpeg';
                
                restoredSession.content = {
                  ...restoredSession.content,
                  imageSource: imageBase64,
                  imageMimeType: mimeType
                };
              } else {
                errors.push(`Image not found for session ${session.id}: ${imagePath}`);
              }
            }
            
            // Restore thumbnail
            if (session.thumbnailUrl && session.thumbnailUrl.startsWith('images/')) {
              const thumbnailPath = session.thumbnailUrl;
              const thumbnailFile = zipContent.file(thumbnailPath);
              
              if (thumbnailFile) {
                const thumbnailBlob = await thumbnailFile.async('blob');
                const thumbnailBase64 = await blobToBase64(thumbnailBlob);
                restoredSession.thumbnailUrl = `data:image/jpeg;base64,${thumbnailBase64}`;
              }
            }
            
            // Import session
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            
            await new Promise<void>((resolveAdd, rejectAdd) => {
              const request = store.add(restoredSession);
              request.onsuccess = () => {
                imported++;
                resolveAdd();
              };
              request.onerror = () => {
                errors.push(`Failed to import session: ${session.id}`);
                rejectAdd(request.error);
              };
            });
            
          } catch (err) {
            errors.push(`Error processing session: ${session.id} - ${err}`);
          }
        }
        
        db.close();
        resolve({ imported, skipped, errors });
        
      } else {
        // Handle old JSON format (for backward compatibility)
        const reader = new FileReader();
        
        reader.onload = async (e) => {
          try {
            const jsonString = e.target?.result as string;
            const data = JSON.parse(jsonString);
            
            if (!data.sessions || !Array.isArray(data.sessions)) {
              reject(new Error('Invalid JSON format: missing sessions array'));
              return;
            }
            
            const db = await initDB();
            let imported = 0;
            let skipped = 0;
            const errors: string[] = [];
            
            for (const session of data.sessions) {
              try {
                if (!session.id || !session.timestamp || !session.content) {
                  skipped++;
                  errors.push(`Skipped invalid session: ${session.id || 'unknown'}`);
                  continue;
                }
                
                const existingSession = await getSession(session.id);
                if (existingSession) {
                  skipped++;
                  continue;
                }
                
                const transaction = db.transaction([STORE_NAME], 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                
                await new Promise<void>((resolveAdd, rejectAdd) => {
                  const request = store.add(session);
                  request.onsuccess = () => {
                    imported++;
                    resolveAdd();
                  };
                  request.onerror = () => {
                    errors.push(`Failed to import session: ${session.id}`);
                    rejectAdd(request.error);
                  };
                });
                
              } catch (err) {
                errors.push(`Error processing session: ${session.id} - ${err}`);
              }
            }
            
            db.close();
            resolve({ imported, skipped, errors });
            
          } catch (err) {
            reject(new Error(`Failed to parse JSON: ${err}`));
          }
        };
        
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
      }
      
    } catch (err) {
      reject(new Error(`Failed to process file: ${err}`));
    }
  });
};
