import 'server-only'

import { cookies } from 'next/headers'

import { decrypt, encrypt } from '@/lib/crypto'

/**
 * The OAuth handshake spans two requests, so the state value and the long lived
 * user token live briefly in httpOnly cookies. The token is encrypted even
 * there, and is cleared as soon as a page is chosen.
 */
export const OAUTH_STATE_COOKIE = 'cora_meta_oauth_state'
export const OAUTH_TOKEN_COOKIE = 'cora_meta_user_token'

const TEN_MINUTES = 600

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    maxAge: TEN_MINUTES,
    path: '/',
  }
}

export async function storeOAuthState(state: string) {
  const store = await cookies()
  store.set(OAUTH_STATE_COOKIE, state, cookieOptions())
}

export async function storeOAuthToken(token: string) {
  const store = await cookies()
  store.set(OAUTH_TOKEN_COOKIE, encrypt(token), cookieOptions())
}

export async function readOAuthToken(): Promise<string | null> {
  const store = await cookies()
  const value = store.get(OAUTH_TOKEN_COOKIE)?.value
  if (!value) return null

  try {
    return decrypt(value)
  } catch {
    return null
  }
}

export async function clearOAuthToken() {
  const store = await cookies()
  store.delete(OAUTH_TOKEN_COOKIE)
}
