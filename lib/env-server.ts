import 'server-only'

import { z } from 'zod'

/**
 * Server only secrets. This module is never reachable from a client component,
 * so the service role key's name does not even appear in the browser bundle.
 */
const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
})

export function serverEnv() {
  const result = serverSchema.safeParse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  })

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('\n')
    throw new Error(`Invalid server environment variables:\n${issues}`)
  }

  return result.data
}
