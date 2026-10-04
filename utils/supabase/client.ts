import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://irsheyzehymddpmmnbot.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_S0LeLGHh9qUs0SQ2vvQ3gg_a6lZzJLP';

export const createClient = () =>
  createBrowserClient(
    supabaseUrl!,
    supabaseKey!,
  );
