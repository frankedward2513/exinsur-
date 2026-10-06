import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient = createClient(
  supabaseUrl || 'http://127.0.0.1:54321',
  supabaseAnonKey || 'public-anon-key'
);

export const db = null;

export function collection(_db: unknown, tableName: string) {
  return { tableName };
}

export function doc(_db: unknown, tableName: string, id: string) {
  return { tableName, id };
}

export function query(collectionRef: { tableName: string }) {
  return collectionRef;
}

export function cleanFirestoreData<T>(data: T): T {
  if (data === null || data === undefined) return null as T;
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => (item !== null && typeof item === 'object' ? cleanFirestoreData(item) : item)) as T;
  }
  if (typeof data === 'object') {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (value !== undefined) cleaned[key] = cleanFirestoreData(value);
    }
    return cleaned as T;
  }
  return data;
}

function camelToSnake(value: string): string {
  return value.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function toSupabaseRecord<T extends object>(data: T): Record<string, unknown> {
  const cleaned = cleanFirestoreData(data) as Record<string, unknown>;
  return Object.fromEntries(
    Object.entries(cleaned).map(([key, value]) => [camelToSnake(key), value])
  );
}

function fromSupabaseRecord<T extends object>(data: Record<string, unknown>): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    result[key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())] = value;
  }
  return result as T;
}

async function readTable<T extends { id: string }>(tableName: string): Promise<T[]> {
  const { data, error } = await supabase.from(tableName).select('*');
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map((row) => fromSupabaseRecord<T>(row));
}

export async function setDoc<T extends object>(
  ref: { tableName: string; id: string },
  data: T
): Promise<void> {
  const row = toSupabaseRecord(data);
  const { error } = await supabase.from(ref.tableName).upsert({ ...row, id: ref.id }, { onConflict: 'id' });
  if (error) throw error;
}

export async function updateDoc<T extends object>(
  ref: { tableName: string; id: string },
  updates: Partial<T>
): Promise<void> {
  const row = toSupabaseRecord(updates);
  const { error } = await supabase.from(ref.tableName).update(row).eq('id', ref.id);
  if (error) throw error;
}

export async function deleteDoc(ref: { tableName: string; id: string }): Promise<void> {
  const { error } = await supabase.from(ref.tableName).delete().eq('id', ref.id);
  if (error) throw error;
}

export function onSnapshot<T>(
  ref: { tableName: string },
  callback: (snapshot: {
    empty: boolean;
    forEach: (visit: (row: T & { id: string; data: () => T }) => void) => void;
  }) => void,
  onError: (error: unknown) => void
) {
  const load = async () => {
    try {
      const rows = await readTable<T & { id: string }>(ref.tableName);
      callback({
        empty: rows.length === 0,
        forEach: (visit) => rows.forEach((row) => visit({ ...row, data: () => row })),
      });
    } catch (error) {
      onError(error);
    }
  };

  void load();
  const channel = supabase
    .channel(`${ref.tableName}_realtime`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: ref.tableName },
      () => void load()
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

export const auth = supabase.auth as typeof supabase.auth & {
  currentUser: User | null;
};
export const googleProvider = { provider: 'google' } as const;

export async function signInWithPopup(
  authService: typeof supabase.auth,
  provider: { provider: 'google' }
): Promise<{ user: (User & { uid: string; displayName?: string }) }> {
  if (provider.provider !== 'google') {
    throw new Error('Only Google authentication is supported.');
  }

  const redirectUrl = typeof window === 'undefined' ? undefined : window.location.origin;
  const { error } = await authService.signInWithOAuth({
    provider: 'google',
    options: redirectUrl ? { redirectTo: redirectUrl } : undefined,
  });

  if (error) throw error;

  const { data: userData } = await authService.getUser();
  if (!userData.user) {
    throw new Error('Google sign-in did not return a user.');
  }

  return {
    user: {
      ...userData.user,
      uid: userData.user.id,
      displayName: userData.user.user_metadata?.full_name || userData.user.email || 'Customer',
    },
  };
}

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
    authInfo: {},
    operationType,
    path,
  };
  console.warn('Supabase Operation Notice:', JSON.stringify(errInfo));
}
