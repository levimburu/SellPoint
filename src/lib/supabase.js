// ============================================================
// SellPoint — database + auth client (Neon)
//
// Kept under the old name `supabase` so every page keeps working
// unchanged. Under the hood this is @neon/neon-js: Neon Auth for
// login and the Neon Data API (PostgREST) for queries, with a
// Supabase-compatible interface.
// ============================================================
import { createClient } from '@neon/neon-js/supabase'

const neonUrl = import.meta.env.VITE_NEON_URL

if (!neonUrl) {
  console.error('Missing VITE_NEON_URL. Check your .env file.')
}

export const supabase = createClient(neonUrl)

// Admin-only auth operations (create/ban/set-password for staff).
// Uses the signed-in admin's session.
export function authAdmin() {
  return supabase.auth.getBetterAuthInstance().admin
}
