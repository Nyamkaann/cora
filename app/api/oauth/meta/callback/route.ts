import { NextResponse, type NextRequest } from 'next/server'

import { getSession } from '@/lib/auth'
import { safeEqual } from '@/lib/crypto'
import { GRAPH_BASE, exchangeForLongLivedToken } from '@/lib/social/meta'
import { OAUTH_STATE_COOKIE, storeOAuthToken } from '@/server/social/oauth-session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SETTINGS_PATH = '/admin/settings/social'

function backTo(origin: string, params: Record<string, string>) {
  const url = new URL(`${origin}${SETTINGS_PATH}`)
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
  return NextResponse.redirect(url)
}

/**
 * Meta redirects here with a code. Exchanges it for a long lived user token and
 * parks it, encrypted, for the page selection step.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)

  const user = await getSession()
  if (!user) return NextResponse.redirect(`${origin}/login`)

  const error = searchParams.get('error_description') ?? searchParams.get('error')
  if (error) return backTo(origin, { error })

  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const expectedState = request.cookies.get(OAUTH_STATE_COOKIE)?.value

  // Without this check a third party could hand us a code of their choosing.
  if (!code || !state || !expectedState || !safeEqual(state, expectedState)) {
    return backTo(origin, { error: 'Холболтын хүсэлт зөв эсэхийг батлаж чадсангүй' })
  }

  const appId = process.env.META_APP_ID
  const appSecret = process.env.META_APP_SECRET
  if (!appId || !appSecret) {
    return backTo(origin, { error: 'META_APP_ID / META_APP_SECRET тохируулаагүй байна' })
  }

  try {
    const tokenUrl = new URL(`${GRAPH_BASE}/oauth/access_token`)
    tokenUrl.searchParams.set('client_id', appId)
    tokenUrl.searchParams.set('client_secret', appSecret)
    tokenUrl.searchParams.set('redirect_uri', `${origin}/api/oauth/meta/callback`)
    tokenUrl.searchParams.set('code', code)

    const response = await fetch(tokenUrl.toString())
    const payload = (await response.json().catch(() => null)) as {
      access_token?: string
      error?: { message?: string }
    } | null

    if (!response.ok || !payload?.access_token) {
      return backTo(origin, { error: payload?.error?.message ?? 'Token солилцоо амжилтгүй' })
    }

    const longLived = await exchangeForLongLivedToken(appId, appSecret, payload.access_token)
    await storeOAuthToken(longLived.accessToken)

    const redirect = backTo(origin, { connected: '1' })
    redirect.cookies.delete(OAUTH_STATE_COOKIE)
    return redirect
  } catch (caught) {
    return backTo(origin, {
      error: caught instanceof Error ? caught.message : 'Холболт амжилтгүй боллоо',
    })
  }
}
