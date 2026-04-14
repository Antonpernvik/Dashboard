import { createBrowserClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const isConfigured =
  SUPABASE_URL.length > 0 &&
  !SUPABASE_URL.includes("placeholder") &&
  SUPABASE_KEY.length > 0 &&
  !SUPABASE_KEY.includes("placeholder");

export function createBrowserSupabase() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_KEY);
}

export function createServerSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_KEY);
}

export { isConfigured };
