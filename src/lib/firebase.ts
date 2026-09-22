import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  collection,
  setDoc,
  getDocs,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { DeckSession } from '../types';

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export { onAuthStateChanged };
export type { User };

// Initialize Firestore with specific databaseId from config
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

/**
 * Validate connection to Firestore on startup as mandated by Firebase Skill
 */
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('Firebase Firestore connection verified.');
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore offline or unreachable. Please check network/config.');
    } else {
      console.log('Firestore connection ping test completed.');
    }
    return false;
  }
}

/**
 * Google Sign-In with popup
 */
export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

/**
 * Sign Out
 */
export async function signOutUser(): Promise<void> {
  await firebaseSignOut(auth);
}

/**
 * Save or update a Deck Session in user's cloud Firestore collection
 */
export async function saveSessionToFirestore(
  userId: string,
  session: DeckSession
): Promise<void> {
  const sessionRef = doc(collection(db, 'users', userId, 'sessions'), String(session.id));
  // Store serializable cue information (without non-serializable object URLs or Blobs)
  const serializableCues = session.cues.map((c) => ({
    id: c.id,
    name: c.name,
    dur: c.dur,
    trimStart: c.trimStart || null,
    trimEnd: c.trimEnd || null,
    target: c.target || null,
    script: c.script || null,
    tags: c.tags || [],
    hue: c.hue,
  }));

  const data = {
    id: session.id,
    userId,
    name: session.name,
    savedAt: session.savedAt || Date.now(),
    cueCount: session.cues.length,
    cues: serializableCues,
    updatedAt: new Date().toISOString(),
  };

  await setDoc(sessionRef, data, { merge: true });
}

/**
 * Load all Deck Sessions for a user from Firestore
 */
export async function loadSessionsFromFirestore(
  userId: string
): Promise<DeckSession[]> {
  const sessionsCol = collection(db, 'users', userId, 'sessions');
  const q = query(sessionsCol, orderBy('updatedAt', 'desc'));
  const snapshot = await getDocs(q);

  const sessions: DeckSession[] = [];
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    sessions.push({
      id: typeof data.id === 'number' ? data.id : Number(docSnap.id) || Date.now(),
      name: data.name || 'Untitled Deck',
      savedAt: data.savedAt || Date.now(),
      cues: (data.cues || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        hue: c.hue,
        dur: c.dur || 0,
        trimStart: c.trimStart,
        trimEnd: c.trimEnd,
        target: c.target,
        script: c.script,
        tags: c.tags,
        blob: new Blob([], { type: 'audio/webm' }),
      })),
    });
  });

  return sessions;
}

/**
 * Delete a session from Firestore
 */
export async function deleteSessionFromFirestore(
  userId: string,
  sessionId: string | number
): Promise<void> {
  const sessionRef = doc(collection(db, 'users', userId, 'sessions'), String(sessionId));
  await deleteDoc(sessionRef);
}
