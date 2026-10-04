declare module 'next/headers' {
  export function cookies(): Promise<{
    getAll: () => Array<{ name: string; value: string }>;
    set: (name: string, value: string, options?: any) => void;
    get: (name: string) => { name: string; value: string } | undefined;
  }>;
}

declare module 'next/server' {
  export interface NextRequest {
    cookies: {
      getAll: () => Array<{ name: string; value: string }>;
      set: (name: string, value: string, options?: any) => void;
      get: (name: string) => { name: string; value: string } | undefined;
    };
    headers: any;
  }
  export const NextResponse: {
    next: (opts?: any) => any;
  };
}
