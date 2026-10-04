import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_URL) ||
  (import.meta as any).env?.VITE_SUPABASE_URL ||
  (import.meta as any).env?.NEXT_PUBLIC_SUPABASE_URL ||
  "https://irsheyzehymddpmmnbot.supabase.co";

const supabaseKey =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ||
  (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY ||
  (import.meta as any).env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_S0LeLGHh9qUs0SQ2vvQ3gg_a6lZzJLP";

export const createClient = () =>
  createBrowserClient(
    supabaseUrl!,
    supabaseKey!,
  );
