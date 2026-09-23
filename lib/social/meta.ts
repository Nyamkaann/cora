import { maskSecret } from '@/lib/crypto'
import { toUnixSeconds } from '@/lib/social/schedule'

/**
 * Meta Graph API client.
 *
 * The version lives here and nowhere else: never hardcode it into a URL.
 */
export const GRAPH_VERSION = 'v24.0'
export const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`

export type SocialPlatform = 'facebook' | 'instagram'

export type GraphLogEntry = {
  platform: SocialPlatform
  method: string
  endpoint: string
  statusCode: number | null
  requestSummary: Record<string, unknown>
  responseSummary: Record<string, unknown> | null
  error: string | null
  durationMs: number
}

export type MetaClientOptions = {
  accessToken: string
  /** Injected so tests can drive the client without a network. */
  fetchImpl?: typeof fetch
  log?: (entry: GraphLogEntry) => void | Promise<void>
  sleep?: (ms: number) => Promise<void>
  now?: () => Date
}

export class MetaApiError extends Error {
  readonly statusCode: number | null
  readonly code: number | null
  readonly subcode: number | null

  constructor(message: string, statusCode: number | null, code: number | null, subcode: number | null) {
    super(message)
    this.name = 'MetaApiError'
    this.statusCode = statusCode
    this.code = code
    this.subcode = subcode
  }
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/** Everything sensitive is stripped before an entry reaches the log table. */
function summarise(params: Record<string, unknown>): Record<string, unknown> {
  const summary: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(params)) {
    if (key === 'access_token' || key === 'client_secret' || key === 'fb_exchange_token') {
      summary[key] = maskSecret(String(value))
      continue
    }
    if (typeof value === 'string' && value.length > 200) {
      summary[key] = `${value.slice(0, 200)}…`
      continue
    }
    summary[key] = value
  }
  return summary
}

export function createMetaClient(options: MetaClientOptions) {
  const doFetch = options.fetchImpl ?? fetch
  const sleep = options.sleep ?? defaultSleep
  const now = options.now ?? (() => new Date())

  async function request<T>(
    platform: SocialPlatform,
    method: 'GET' | 'POST',
    path: string,
    params: Record<string, string | number | boolean | undefined> = {},
    scheduledPostId?: string,
  ): Promise<T> {
    const withToken: Record<string, string> = { access_token: options.accessToken }
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) withToken[key] = String(value)
    }

    const startedAt = Date.now()
    let statusCode: number | null = null
    let payload: unknown = null
    let errorMessage: string | null = null

    try {
      const url = new URL(`${GRAPH_BASE}/${path}`)
      let response: Response

      if (method === 'GET') {
        for (const [key, value] of Object.entries(withToken)) url.searchParams.set(key, value)
        response = await doFetch(url.toString())
      } else {
        response = await doFetch(url.toString(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams(withToken).toString(),
        })
      }

      statusCode = response.status
      payload = await response.json().catch(() => null)

      const errorPayload = (payload as { error?: { message?: string; code?: number; error_subcode?: number } } | null)
        ?.error

      if (!response.ok || errorPayload) {
        errorMessage = errorPayload?.message ?? `Graph API ${response.status}`
        throw new MetaApiError(
          errorMessage,
          statusCode,
          errorPayload?.code ?? null,
          errorPayload?.error_subcode ?? null,
        )
      }

      return payload as T
    } catch (error) {
      if (errorMessage === null) {
        errorMessage = error instanceof Error ? error.message : String(error)
      }
      throw error
    } finally {
      await options.log?.({
        platform,
        method,
        endpoint: path,
        statusCode,
        requestSummary: summarise(withToken),
        responseSummary:
          payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : null,
        error: errorMessage,
        durationMs: Date.now() - startedAt,
        ...(scheduledPostId ? { scheduledPostId } : {}),
      } as GraphLogEntry)
    }
  }

  return {
    /** Pages the signed in user administers. */
    async listPages() {
      const data = await request<{ data: { id: string; name: string; access_token: string }[] }>(
        'facebook',
        'GET',
        'me/accounts',
        { fields: 'id,name,access_token' },
      )
      return data.data ?? []
    },

    /** Used by the "check the connection" button. */
    async getPage(pageId: string) {
      return request<{ id: string; name: string; fan_count?: number }>(
        'facebook',
        'GET',
        pageId,
        { fields: 'name,fan_count' },
      )
    },

    /** The Instagram business account attached to a page, if any. */
    async getInstagramAccount(pageId: string) {
      const data = await request<{
        instagram_business_account?: { id: string; username?: string }
      }>('facebook', 'GET', pageId, { fields: 'instagram_business_account{id,username}' })

      return data.instagram_business_account ?? null
    },

    /** Publishes a photo to a page straight away. */
    async postPhotoToPage(
      pageId: string,
      input: { imageUrl: string; message?: string },
      scheduledPostId?: string,
    ) {
      return request<{ id: string; post_id?: string }>(
        'facebook',
        'POST',
        `${pageId}/photos`,
        { url: input.imageUrl, message: input.message, published: true },
        scheduledPostId,
      )
    },

    /**
     * Scheduling needs two calls: /photos cannot schedule, so the photo is
     * uploaded unpublished and then attached to a scheduled feed post.
     */
    async schedulePhotoOnPage(
      pageId: string,
      input: { imageUrl: string; message?: string; scheduledAt: Date },
      scheduledPostId?: string,
    ) {
      const photo = await request<{ id: string }>(
        'facebook',
        'POST',
        `${pageId}/photos`,
        { url: input.imageUrl, published: false },
        scheduledPostId,
      )

      return request<{ id: string }>(
        'facebook',
        'POST',
        `${pageId}/feed`,
        {
          message: input.message,
          attached_media: JSON.stringify([{ media_fbid: photo.id }]),
          published: false,
          scheduled_publish_time: toUnixSeconds(input.scheduledAt),
        },
        scheduledPostId,
      )
    },

    /** Instagram allows 100 published posts per rolling 24 hours. */
    async getInstagramPublishingLimit(igUserId: string) {
      const data = await request<{
        data: { quota_usage: number; config?: { quota_total?: number } }[]
      }>('instagram', 'GET', `${igUserId}/content_publishing_limit`, {
        fields: 'config,quota_usage',
      })

      const first = data.data?.[0]
      return {
        used: first?.quota_usage ?? 0,
        total: first?.config?.quota_total ?? 100,
      }
    },

    /**
     * Instagram is a two step publish with a container in between. Publishing
     * before the container reports FINISHED fails, so this polls first.
     */
    async postToInstagram(
      igUserId: string,
      input: { imageUrl: string; caption?: string },
      scheduledPostId?: string,
    ) {
      const container = await request<{ id: string }>(
        'instagram',
        'POST',
        `${igUserId}/media`,
        { image_url: input.imageUrl, caption: input.caption },
        scheduledPostId,
      )

      const deadline = now().getTime() + 60_000
      let status = ''

      while (now().getTime() < deadline) {
        const state = await request<{ status_code?: string; status?: string }>(
          'instagram',
          'GET',
          container.id,
          { fields: 'status_code,status' },
          scheduledPostId,
        )

        status = state.status_code ?? ''
        if (status === 'FINISHED') break
        if (status === 'ERROR' || status === 'EXPIRED') {
          throw new MetaApiError(
            `Instagram container ${status.toLowerCase()}: ${state.status ?? ''}`.trim(),
            null,
            null,
            null,
          )
        }

        await sleep(2000)
      }

      if (status !== 'FINISHED') {
        throw new MetaApiError('Instagram container did not finish within 60 seconds', null, null, null)
      }

      return request<{ id: string }>(
        'instagram',
        'POST',
        `${igUserId}/media_publish`,
        { creation_id: container.id },
        scheduledPostId,
      )
    },
  }
}

export type MetaClient = ReturnType<typeof createMetaClient>

/** Short lived user token to a long lived one (~60 days). */
export async function exchangeForLongLivedToken(
  appId: string,
  appSecret: string,
  shortLivedToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ accessToken: string; expiresAt: Date | null }> {
  const url = new URL(`${GRAPH_BASE}/oauth/access_token`)
  url.searchParams.set('grant_type', 'fb_exchange_token')
  url.searchParams.set('client_id', appId)
  url.searchParams.set('client_secret', appSecret)
  url.searchParams.set('fb_exchange_token', shortLivedToken)

  const response = await fetchImpl(url.toString())
  const payload = (await response.json().catch(() => null)) as {
    access_token?: string
    expires_in?: number
    error?: { message?: string }
  } | null

  if (!response.ok || !payload?.access_token) {
    throw new MetaApiError(
      payload?.error?.message ?? 'Could not exchange the token',
      response.status,
      null,
      null,
    )
  }

  return {
    accessToken: payload.access_token,
    expiresAt: payload.expires_in ? new Date(Date.now() + payload.expires_in * 1000) : null,
  }
}
