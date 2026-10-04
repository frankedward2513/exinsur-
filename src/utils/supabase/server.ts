import { createServerClient } from "@supabase/ssr";

const supabaseUrl =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_URL) ||
  (import.meta as any).env?.VITE_SUPABASE_URL ||
  "https://irsheyzehymddpmmnbot.supabase.co";

const supabaseKey =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ||
  (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_S0LeLGHh9qUs0SQ2vvQ3gg_a6lZzJLP";

export const createClient = (cookieStore?: any) => {
  return createServerClient(
    supabaseUrl!,
    supabaseKey!,
    {
      cookies: {
        getAll() {
          return cookieStore?.getAll ? cookieStore.getAll() : [];
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }: any) => {
              if (cookieStore?.set) {
                cookieStore.set(name, value, options);
              }
            });
          } catch {
            // Ignored if in server component
          }
        },
      },
    },
  );
};
