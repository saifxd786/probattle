/**
 * PWA-Compatible Auth Storage
 * 
 * Simplified storage adapter that works correctly for both browser and PWA modes.
 * Uses localStorage as primary with IndexedDB backup ONLY for PWA standalone mode.
 */

const STORAGE_KEY_PREFIX = 'sb-blgjfoyxwszxwiqrsrpw-auth-';
const SESSION_KEY = `${STORAGE_KEY_PREFIX}token`;

// IndexedDB for PWA-only backup
const DB_NAME = 'probattle_auth_db';
const DB_VERSION = 1;
const STORE_NAME = 'auth_store';

let db: IDBDatabase | null = null;
let isPWAMode: boolean | null = null;

/**
 * Check if running in PWA standalone mode (cached)
 */
export const isPWAStandalone = (): boolean => {
  if (isPWAMode === null) {
    isPWAMode = window.matchMedia('(display-mode: standalone)').matches ||
                (window.navigator as any).standalone === true;
  }
  return isPWAMode;
};

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    try {
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
          database.createObjectStore(STORE_NAME, { keyPath: 'key' });
        }
      };
    } catch (error) {
      reject(error);
    }
  });
};

const saveToIndexedDB = async (key: string, value: string): Promise<void> => {
  // Only save to IndexedDB in PWA mode
  if (!isPWAStandalone()) return;
  
  try {
    const database = await openDB();
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.put({ key, value, timestamp: Date.now() });
  } catch {
    // Silent fail - IndexedDB is optional backup
  }
};

const getFromIndexedDB = async (key: string): Promise<string | null> => {
  try {
    const database = await openDB();
    return new Promise((resolve) => {
      const transaction = database.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);
      
      request.onsuccess = () => {
        resolve(request.result?.value || null);
      };
      
      request.onerror = () => {
        resolve(null);
      };
    });
  } catch {
    return null;
  }
};

const removeFromIndexedDB = async (key: string): Promise<void> => {
  if (!isPWAStandalone()) return;
  
  try {
    const database = await openDB();
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.delete(key);
  } catch {
    // Silent fail
  }
};

/**
 * Simple storage adapter for Supabase Auth
 * Uses localStorage directly - no complex backup logic that causes conflicts
 */
export const pwaAuthStorage = {
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },

  setItem: (key: string, value: string): void => {
    try {
      localStorage.setItem(key, value);
      
      // Async backup to IndexedDB for PWA mode only
      if (key.includes('auth') || key.includes(STORAGE_KEY_PREFIX)) {
        saveToIndexedDB(key, value);
      }
    } catch (error) {
      console.warn('[Auth] Storage write error:', error);
    }
  },

  removeItem: (key: string): void => {
    try {
      localStorage.removeItem(key);
      
      if (key.includes('auth') || key.includes(STORAGE_KEY_PREFIX)) {
        removeFromIndexedDB(key);
      }
    } catch {
      // Silent fail
    }
  }
};

/**
 * Initialize PWA auth storage
 * Only restores from IndexedDB in PWA standalone mode when localStorage is empty
 */
export const initPWAAuthStorage = async (): Promise<void> => {
  // Quick check - if not PWA mode, nothing to do
  if (!isPWAStandalone()) {
    console.log('[Auth] Browser mode - using localStorage directly');
    return;
  }
  
  console.log('[Auth] PWA mode detected - checking for session recovery');
  
  // Timeout to prevent blocking
  const timeoutPromise = new Promise<void>((resolve) => {
    setTimeout(resolve, 1500);
  });
  
  const recoveryPromise = (async () => {
    try {
      const localSession = localStorage.getItem(SESSION_KEY);
      
      if (!localSession) {
        // Try to restore from IndexedDB
        const indexedDBSession = await Promise.race([
          getFromIndexedDB(SESSION_KEY),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 1000))
        ]);
        
        if (indexedDBSession) {
          console.log('[Auth] PWA: Restored session from IndexedDB');
          localStorage.setItem(SESSION_KEY, indexedDBSession);
        }
      } else {
        // Sync current session to IndexedDB
        saveToIndexedDB(SESSION_KEY, localSession);
      }
    } catch {
      // Silent fail - auth will handle missing session
    }
  })();
  
  await Promise.race([recoveryPromise, timeoutPromise]);
};
