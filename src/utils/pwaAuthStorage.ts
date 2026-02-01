/**
 * PWA-Compatible Auth Storage
 * 
 * This storage adapter ensures session persistence works correctly in PWA/standalone mode.
 * It uses localStorage with fallback mechanisms and periodic sync to IndexedDB for robustness.
 */

const STORAGE_KEY_PREFIX = 'sb-blgjfoyxwszxwiqrsrpw-auth-';
const SESSION_KEY = `${STORAGE_KEY_PREFIX}token`;
const BACKUP_KEY = 'probattle_auth_backup';

// IndexedDB for robust PWA storage
const DB_NAME = 'probattle_auth_db';
const DB_VERSION = 1;
const STORE_NAME = 'auth_store';

let db: IDBDatabase | null = null;

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.warn('[PWA Auth] IndexedDB not available');
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
      console.warn('[PWA Auth] IndexedDB error:', error);
      reject(error);
    }
  });
};

const saveToIndexedDB = async (key: string, value: string): Promise<void> => {
  try {
    const database = await openDB();
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.put({ key, value, timestamp: Date.now() });
  } catch (error) {
    console.warn('[PWA Auth] Failed to save to IndexedDB:', error);
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
  try {
    const database = await openDB();
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.delete(key);
  } catch (error) {
    console.warn('[PWA Auth] Failed to remove from IndexedDB:', error);
  }
};

/**
 * PWA-compatible storage adapter for Supabase Auth
 */
export const pwaAuthStorage = {
  getItem: (key: string): string | null => {
    try {
      // Try localStorage first
      const value = localStorage.getItem(key);
      
      if (value) {
        // Also backup to sessionStorage for extra redundancy
        try {
          sessionStorage.setItem(BACKUP_KEY, value);
        } catch {}
        return value;
      }
      
      // Fallback to sessionStorage backup
      const backup = sessionStorage.getItem(BACKUP_KEY);
      if (backup && key.includes('auth')) {
        // Restore to localStorage
        try {
          localStorage.setItem(key, backup);
        } catch {}
        return backup;
      }
      
      return null;
    } catch (error) {
      console.warn('[PWA Auth] Storage read error:', error);
      // Last resort: try sessionStorage
      try {
        return sessionStorage.getItem(key);
      } catch {
        return null;
      }
    }
  },

  setItem: (key: string, value: string): void => {
    try {
      // Save to localStorage (primary)
      localStorage.setItem(key, value);
      
      // Backup to sessionStorage
      if (key.includes('auth')) {
        try {
          sessionStorage.setItem(BACKUP_KEY, value);
        } catch {}
        
        // Async save to IndexedDB for PWA robustness
        saveToIndexedDB(key, value).catch(() => {});
      }
    } catch (error) {
      console.warn('[PWA Auth] Storage write error:', error);
      // Fallback to sessionStorage
      try {
        sessionStorage.setItem(key, value);
      } catch {}
    }
  },

  removeItem: (key: string): void => {
    try {
      localStorage.removeItem(key);
      
      if (key.includes('auth')) {
        try {
          sessionStorage.removeItem(BACKUP_KEY);
        } catch {}
        removeFromIndexedDB(key).catch(() => {});
      }
    } catch (error) {
      console.warn('[PWA Auth] Storage remove error:', error);
      try {
        sessionStorage.removeItem(key);
      } catch {}
    }
  }
};

/**
 * Initialize PWA auth storage - restore session from IndexedDB if localStorage is empty
 */
export const initPWAAuthStorage = async (): Promise<void> => {
  try {
    // Check if we're in PWA standalone mode
    const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                  (window.navigator as any).standalone === true;
    
    if (!isPWA) return;
    
    console.log('[PWA Auth] Initializing PWA storage...');
    
    // Check if localStorage has the session
    const localSession = localStorage.getItem(SESSION_KEY);
    
    if (!localSession) {
      // Try to restore from IndexedDB
      const indexedDBSession = await getFromIndexedDB(SESSION_KEY);
      
      if (indexedDBSession) {
        console.log('[PWA Auth] Restoring session from IndexedDB');
        localStorage.setItem(SESSION_KEY, indexedDBSession);
      } else {
        // Try sessionStorage backup
        const backupSession = sessionStorage.getItem(BACKUP_KEY);
        if (backupSession) {
          console.log('[PWA Auth] Restoring session from backup');
          localStorage.setItem(SESSION_KEY, backupSession);
        }
      }
    } else {
      // Ensure IndexedDB is synced
      await saveToIndexedDB(SESSION_KEY, localSession);
    }
  } catch (error) {
    console.warn('[PWA Auth] Init error:', error);
  }
};

/**
 * Check if running in PWA standalone mode
 */
export const isPWAStandalone = (): boolean => {
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone === true;
};
