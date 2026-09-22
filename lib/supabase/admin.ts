import 'server-only'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

import { env, serverEnv } from '@/lib/env'

/**
 * Service role client. Bypasses RLS, so it must never reach the browser.
 * Only use it where an admin task genuinely needs it.
 */
export function createAdminClient() {
  const { SUPABASE_SERVICE_ROLE_KEY } = serverEnv()

  return createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
