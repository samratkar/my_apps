import { Session } from './types';

const DB_NAME = 'SamsCanvasDB';
const DB_VERSION = 1;
const STORE_NAME = 'sessions';

let db: IDBDatabase | null = null;

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
        store.createIndex('title', 'title', { unique: false });
      }
    };
  });
};

export const saveSession = async (session: Session): Promise<void> => {
  const database = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const request = store.put(session);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getSession = async (id: string): Promise<Session | undefined> => {
  const database = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    
    const request = store.get(id);
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const getAllSessions = async (): Promise<Session[]> => {
  const database = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    
    const request = store.getAll();
    
    request.onsuccess = () => {
      const sessions = request.result as Session[];
      // Sort by updatedAt descending (most recent first)
      sessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      resolve(sessions);
    };
    request.onerror = () => reject(request.error);
  });
};

export const deleteSession = async (id: string): Promise<void> => {
  const database = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const request = store.delete(id);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const generateSessionId = (): string => {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};
