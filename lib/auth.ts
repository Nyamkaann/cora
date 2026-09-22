import { redirect } from 'next/navigation'
import type { User } from '@supabase/supabase-js'

import { createClient } from '@/lib/supabase/server'

/** Current user or null. Never throws. */
export async function getSession(): Promise<User | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return user
}

/** Current user, or redirect to the login page. Use at the top of every action. */
export async function requireUser(): Promise<User> {
  const user = await getSession()
  if (!user) {
    redirect('/login')
  }

  return user
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
}
