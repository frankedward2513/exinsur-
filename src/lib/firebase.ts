import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInAnonymously, signInWithPopup } from 'firebase/auth';
import { initializeFirestore, getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Initialize Firestore with experimentalForceLongPolling to avoid 10s WebChannel timeout in browser/iframe environments
export const db = initializeFirestore(
  app,
  {
    ...(typeof window !== 'undefined' ? { experimentalForceLongPolling: true } : {}),
    ignoreUndefinedProperties: true,
  },
  firebaseConfig.firestoreDatabaseId
);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export { signInWithPopup };

// Clean undefined values deeply to prevent Firestore rejection on nested objects/arrays
export function cleanFirestoreData<T>(data: T): T {
  if (data === null || data === undefined) {
    return null as any;
  }
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => (item !== null && typeof item === 'object' ? cleanFirestoreData(item) : item)) as any;
  }
  if (typeof data === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(data as Record<string, any>)) {
      if (value !== undefined) {
        cleaned[key] = value !== null && typeof value === 'object' ? cleanFirestoreData(value) : value;
      }
    }
    return cleaned as T;
  }
  return data;
}

// Automatically ensure auth session
signInAnonymously(auth).catch((e) => {
  console.warn('Anonymous auth initialization note:', e?.message || e);
});

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): void {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
    },
    operationType,
    path,
  };
  console.warn('Firestore Operation Notice: ', JSON.stringify(errInfo));
}

// Validate Connection to Firestore on startup
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase is currently offline or connecting...');
    }
    return false;
  }
}
