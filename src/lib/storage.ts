import { Cue, DeckSession, ExportDeckFile } from '../types';

const DB_NAME = 'sottocue_db';
const DB_VERSION = 2;
const STORE_SESSIONS = 'sessions';
const STORE_CURRENT = 'current_deck';

let dbInstance: IDBDatabase | null = null;

export async function initDB(): Promise<boolean> {
  if (typeof window === 'undefined' || !window.indexedDB) return false;
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_SESSIONS)) {
          db.createObjectStore(STORE_SESSIONS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_CURRENT)) {
          db.createObjectStore(STORE_CURRENT, { keyPath: 'key' });
        }
      };
      request.onsuccess = (event) => {
        dbInstance = (event.target as IDBOpenDBRequest).result;
        resolve(true);
      };
      request.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

export async function getAllSessions(): Promise<DeckSession[]> {
  const db = dbInstance;
  if (!db) {
    try {
      const raw = localStorage.getItem('sottocue_sessions_fallback');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_SESSIONS, 'readonly');
      const store = tx.objectStore(STORE_SESSIONS);
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result as DeckSession[]) || []);
      req.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

export async function saveSessionToDB(session: DeckSession): Promise<boolean> {
  const db = dbInstance;
  if (!db) {
    try {
      const current = await getAllSessions();
      const updated = [session, ...current.filter((s) => s.id !== session.id)].slice(0, 15);
      localStorage.setItem('sottocue_sessions_fallback', JSON.stringify(updated));
      return true;
    } catch {
      return false;
    }
  }

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_SESSIONS, 'readwrite');
      const store = tx.objectStore(STORE_SESSIONS);
      const req = store.put(session);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

export async function deleteSessionFromDB(id: number): Promise<boolean> {
  const db = dbInstance;
  if (!db) {
    try {
      const current = await getAllSessions();
      const filtered = current.filter((s) => s.id !== id);
      localStorage.setItem('sottocue_sessions_fallback', JSON.stringify(filtered));
      return true;
    } catch {
      return false;
    }
  }

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_SESSIONS, 'readwrite');
      const store = tx.objectStore(STORE_SESSIONS);
      const req = store.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const b64 = result.split(',')[1] || '';
      resolve(b64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function base64ToBlob(b64: string, mimeType = 'audio/webm'): Blob {
  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

export async function exportDeckToFile(name: string, cues: Cue[]): Promise<Blob> {
  const serializedCues = [];
  for (const c of cues) {
    if (!c.blob) continue;
    const b64 = await blobToBase64(c.blob);
    serializedCues.push({
      id: c.id,
      name: c.name,
      hue: c.hue,
      dur: c.dur,
      trimStart: c.trimStart,
      trimEnd: c.trimEnd,
      target: c.target,
      script: c.script,
      tags: c.tags,
      type: c.blob.type || 'audio/webm',
      b64,
    });
  }

  const exportData: ExportDeckFile = {
    app: 'sottocue',
    version: 2,
    name: name || 'Sotto Cue Deck',
    exportedAt: Date.now(),
    cues: serializedCues,
  };

  return new Blob([JSON.stringify(exportData, null, 2)], {
    type: 'application/json',
  });
}
