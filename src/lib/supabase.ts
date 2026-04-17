/**
 * Supabase client singleton.
 *
 * Two clients:
 * - `supabase` (anon key): For client-side and RLS-aware queries.
 * - `supabaseAdmin` (service_role key): For server-side API routes (bypasses RLS).
 *
 * Only initialize when NEXT_PUBLIC_BACKEND_MODE=server and credentials exist.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;
let _adminClient: SupabaseClient | null = null;

function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
  return url;
}

/**
 * Public Supabase client (uses anon key, respects RLS).
 */
export function getSupabase(): SupabaseClient {
  if (_client) return _client;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!anonKey) throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not set");
  _client = createClient(getSupabaseUrl(), anonKey);
  return _client;
}

/**
 * Admin Supabase client (uses service_role key, BYPASSES RLS).
 * Only use in server-side API routes — never expose to client.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (_adminClient) return _adminClient;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  _adminClient = createClient(getSupabaseUrl(), serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return _adminClient;
}

/**
 * Check if Supabase is configured (all env vars present).
 */
export function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}
