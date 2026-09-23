import 'server-only'

import { decrypt, encrypt } from '@/lib/crypto'
import { createMetaClient, type GraphLogEntry, type SocialPlatform } from '@/lib/social/meta'
import { createClient } from '@/lib/supabase/server'

export type ConnectedAccount = {
  id: string
  platform: SocialPlatform
  externalId: string
  name: string | null
  parentPageId: string | null
  tokenExpiresAt: string | null
  isActive: boolean
  /** Warn the admin a week before the token dies. */
  expiresSoon: boolean
}

const EXPIRY_WARNING_MS = 7 * 24 * 60 * 60 * 1000

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

/** Writes a Graph call to the log. Tokens are already masked by the client. */
export async function logGraphCall(entry: GraphLogEntry & { scheduledPostId?: string }) {
  const supabase = await createClient()

  await supabase.from('social_api_log').insert({
    platform: entry.platform,
    method: entry.method,
    endpoint: entry.endpoint,
    status_code: entry.statusCode,
    request_summary: entry.requestSummary,
    response_summary: entry.responseSummary,
    error: entry.error,
    duration_ms: entry.durationMs,
    scheduled_post_id: entry.scheduledPostId ?? null,
  })
}

export async function listConnectedAccounts(): Promise<ConnectedAccount[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('social_accounts')
    .select('id, platform, external_id, name, parent_page_id, token_expires_at, is_active')
    .order('platform')

  if (error) throw new Error(error.message)

  type Raw = {
    id: string
    platform: SocialPlatform
    external_id: string
    name: string | null
    parent_page_id: string | null
    token_expires_at: string | null
    is_active: boolean
  }

  return ((data ?? []) as Raw[]).map((row) => ({
    id: row.id,
    platform: row.platform,
    externalId: row.external_id,
    name: row.name,
    parentPageId: row.parent_page_id,
    tokenExpiresAt: row.token_expires_at,
    isActive: row.is_active,
    expiresSoon: row.token_expires_at
      ? new Date(row.token_expires_at).getTime() - Date.now() < EXPIRY_WARNING_MS
      : false,
  }))
}

export async function saveConnectedAccount(input: {
  platform: SocialPlatform
  externalId: string
  name: string | null
  accessToken: string
  tokenExpiresAt: Date | null
  parentPageId?: string | null
  connectedBy: string
}) {
  const supabase = await createClient()

  const { error } = await supabase.from('social_accounts').upsert(
    {
      platform: input.platform,
      external_id: input.externalId,
      name: input.name,
      access_token_encrypted: encrypt(input.accessToken),
      token_expires_at: input.tokenExpiresAt?.toISOString() ?? null,
      parent_page_id: input.parentPageId ?? null,
      is_active: true,
      connected_by: input.connectedBy,
    },
    { onConflict: 'platform,external_id' },
  )

  if (error) throw new Error(error.message)
}

/** Decrypted token for a platform, or null when nothing is connected. */
async function readToken(
  supabase: SupabaseServerClient,
  platform: SocialPlatform,
): Promise<{ token: string; externalId: string; parentPageId: string | null } | null> {
  const { data } = await supabase
    .from('social_accounts')
    .select('external_id, access_token_encrypted, parent_page_id')
    .eq('platform', platform)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()

  if (!data) return null

  return {
    token: decrypt(data.access_token_encrypted),
    externalId: data.external_id,
    parentPageId: data.parent_page_id,
  }
}

/**
 * A Graph client bound to the stored token, with logging wired in. Instagram
 * publishes with its parent page's token, so both platforms resolve to the
 * page token.
 */
export async function getMetaClientFor(
  platform: SocialPlatform,
  scheduledPostId?: string,
): Promise<{ client: ReturnType<typeof createMetaClient>; externalId: string } | null> {
  const supabase = await createClient()

  const account = await readToken(supabase, platform)
  if (!account) return null

  let token = account.token
  if (platform === 'instagram') {
    const page = await readToken(supabase, 'facebook')
    if (page) token = page.token
  }

  return {
    client: createMetaClient({
      accessToken: token,
      log: (entry) => logGraphCall({ ...entry, scheduledPostId }),
    }),
    externalId: account.externalId,
  }
}

export type ApiLogRow = {
  id: string
  platform: string
  method: string
  endpoint: string
  statusCode: number | null
  error: string | null
  durationMs: number | null
  createdAt: string
}

/** Last 50 calls for the settings screen. */
export async function listApiLog(limit = 50): Promise<ApiLogRow[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('social_api_log')
    .select('id, platform, method, endpoint, status_code, error, duration_ms, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  type Raw = {
    id: string
    platform: string
    method: string
    endpoint: string
    status_code: number | null
    error: string | null
    duration_ms: number | null
    created_at: string
  }

  return ((data ?? []) as Raw[]).map((row) => ({
    id: row.id,
    platform: row.platform,
    method: row.method,
    endpoint: row.endpoint,
    statusCode: row.status_code,
    error: row.error,
    durationMs: row.duration_ms,
    createdAt: row.created_at,
  }))
}
