import { createBrowserClient } from '@supabase/ssr'

import { env } from '@/lib/env'

// Browser client for client components. Anon key only.
// Add the generated <Database> generic once `pnpm db:types` has been run.
export function createClient() {
  return createBrowserClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}
