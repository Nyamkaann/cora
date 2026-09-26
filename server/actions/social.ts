'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { actionError, type ActionResult } from '@/lib/action-result'
import { requireUser } from '@/lib/auth'
import { GRAPH_VERSION, MetaApiError, createMetaClient } from '@/lib/social/meta'
import { createClient } from '@/lib/supabase/server'
import { getMetaClientFor, logGraphCall, saveConnectedAccount } from '@/server/social/accounts'
import {
  clearOAuthToken,
  readOAuthToken,
  storeOAuthState,
} from '@/server/social/oauth-session'

/**
 * Everything Phase 8 needs. Facebook Login for Business ignores `scope` and
 * reads the permissions off the login configuration instead, so these are only
 * sent when no configuration id is set.
 */
const SCOPES = [
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_posts',
  'business_management',
  'instagram_basic',
  'instagram_content_publish',
]

function appCredentials() {
  const appId = process.env.META_APP_ID
  const appSecret = process.env.META_APP_SECRET
  if (!appId || !appSecret) return null
  return { appId, appSecret }
}

function callbackUrl(): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  return `${base.replace(/\/$/, '')}/api/oauth/meta/callback`
}

/**
 * Builds the Meta consent url and remembers a state value, so the callback can
 * prove the redirect came from this session.
 */
export async function startMetaOAuth(): Promise<ActionResult<{ url: string }>> {
  await requireUser()

  const credentials = appCredentials()
  if (!credentials) {
    return actionError('META_APP_ID болон META_APP_SECRET тохируулаагүй байна.')
  }

  const state = crypto.randomUUID()
  await storeOAuthState(state)

  const url = new URL(`https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`)
  url.searchParams.set('client_id', credentials.appId)
  url.searchParams.set('redirect_uri', callbackUrl())
  url.searchParams.set('state', state)
  url.searchParams.set('response_type', 'code')

  // The configuration id is not a secret: it travels in the consent url.
  const configId = process.env.META_LOGIN_CONFIG_ID
  if (configId) {
    url.searchParams.set('config_id', configId)
  } else {
    url.searchParams.set('scope', SCOPES.join(','))
  }

  return { ok: true, data: { url: url.toString() } }
}

export type PageChoice = { id: string; name: string }

/**
 * Pages the connecting user administers. Read with the short lived user token
 * the callback parked in a cookie.
 */
export async function listMetaPages(): Promise<ActionResult<{ pages: PageChoice[] }>> {
  await requireUser()

  const userToken = await readOAuthToken()
  if (!userToken) {
    return actionError('Холболтын сесс дууссан байна. «Facebook холбох»-ыг дахин дарна уу.')
  }

  try {
    const client = createMetaClient({ accessToken: userToken, log: logGraphCall })
    const pages = await client.listPages()
    return { ok: true, data: { pages: pages.map((page) => ({ id: page.id, name: page.name })) } }
  } catch (error) {
    return actionError(error instanceof Error ? error.message : 'Page жагсаалт авч чадсангүй')
  }
}

/**
 * Stores the chosen page's token, then finds and stores the Instagram business
 * account hanging off it.
 */
export async function connectMetaPage(pageId: string): Promise<ActionResult<{ instagram: boolean }>> {
  const user = await requireUser()

  const idCheck = z.string().min(1).safeParse(pageId)
  if (!idCheck.success) return actionError('Page ID буруу байна')

  const userToken = await readOAuthToken()
  if (!userToken) {
    return actionError('Холболтын сесс дууссан байна. «Facebook холбох»-ыг дахин дарна уу.')
  }

  try {
    const userClient = createMetaClient({ accessToken: userToken, log: logGraphCall })

    const pages = await userClient.listPages()
    const page = pages.find((candidate) => candidate.id === pageId)
    if (!page) return actionError('Тухайн Page олдсонгүй')

    // Page tokens issued from a long lived user token do not expire on their
    // own, but Meta can still invalidate them, so the warning window is kept.
    await saveConnectedAccount({
      platform: 'facebook',
      externalId: page.id,
      name: page.name,
      accessToken: page.access_token,
      tokenExpiresAt: null,
      connectedBy: user.id,
    })

    const pageClient = createMetaClient({ accessToken: page.access_token, log: logGraphCall })
    const instagram = await pageClient.getInstagramAccount(page.id)

    if (instagram) {
      await saveConnectedAccount({
        platform: 'instagram',
        externalId: instagram.id,
        name: instagram.username ?? null,
        accessToken: page.access_token,
        tokenExpiresAt: null,
        parentPageId: page.id,
        connectedBy: user.id,
      })
    }

    await clearOAuthToken()
    revalidatePath('/admin/settings/social')

    return { ok: true, data: { instagram: Boolean(instagram) } }
  } catch (error) {
    if (error instanceof MetaApiError) return actionError(error.message)
    return actionError(error instanceof Error ? error.message : 'Холбож чадсангүй')
  }
}

/** "Check the connection": a live read of the page's name and follower count. */
export async function testMetaConnection(): Promise<
  ActionResult<{ name: string; fanCount: number | null; instagram: string | null }>
> {
  await requireUser()

  const facebook = await getMetaClientFor('facebook')
  if (!facebook) return actionError('Facebook Page холбогдоогүй байна')

  try {
    const page = await facebook.client.getPage(facebook.externalId)
    const instagram = await facebook.client.getInstagramAccount(facebook.externalId)

    return {
      ok: true,
      data: {
        name: page.name,
        fanCount: page.fan_count ?? null,
        instagram: instagram?.username ?? null,
      },
    }
  } catch (error) {
    return actionError(error instanceof Error ? error.message : 'Холболт шалгаж чадсангүй')
  }
}

export async function disconnectMetaAccounts(): Promise<ActionResult> {
  await requireUser()

  const supabase = await createClient()
  const { error } = await supabase
    .from('social_accounts')
    .update({ is_active: false })
    .in('platform', ['facebook', 'instagram'])

  if (error) return actionError(error.message)

  revalidatePath('/admin/settings/social')
  return { ok: true, data: undefined }
}
