import { createClient, type SupabaseClient } from "@supabase/supabase-js"

let cached: SupabaseClient | null = null

/**
 * Service-role Supabase client. Server-only: bypasses row-level security, so every caller
 * must scope queries to the right owner itself. Used for Meta webhooks (no user session)
 * and for reading encrypted channel tokens.
 */
export function createAdminClient(): SupabaseClient {
  if (cached) return cached
  if (typeof window !== "undefined") throw new Error("The admin client cannot run in the browser.")
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY
  if (!url || !key) throw new Error("Supabase service credentials are not configured.")
  cached = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  return cached
}
