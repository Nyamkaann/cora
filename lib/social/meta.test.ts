import { beforeAll, describe, expect, it, vi } from 'vitest'
import { randomBytes } from 'node:crypto'

import { GRAPH_VERSION, MetaApiError, createMetaClient } from './meta'

beforeAll(() => {
  process.env.ENCRYPTION_KEY = randomBytes(32).toString('base64')
})

type Handler = (url: string, init?: RequestInit) => { status?: number; body: unknown }

/** Minimal stand in for the Graph API, so no network is touched. */
function mockGraph(handlers: Handler[]) {
  const calls: { url: string; body: string | null }[] = []
  let index = 0

  const fetchImpl = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input)
    calls.push({ url, body: typeof init?.body === 'string' ? init.body : null })

    const handler = handlers[Math.min(index, handlers.length - 1)]
    index += 1
    const result = handler?.(url, init) ?? { body: {} }

    return {
      ok: (result.status ?? 200) < 400,
      status: result.status ?? 200,
      json: async () => result.body,
    } as Response
  }) as unknown as typeof fetch

  return { fetchImpl, calls }
}

describe('createMetaClient', () => {
  it('targets the configured Graph version', async () => {
    const { fetchImpl, calls } = mockGraph([() => ({ body: { id: '1', name: 'Cora' } })])
    const client = createMetaClient({ accessToken: 'token', fetchImpl })

    await client.getPage('106022465447849')

    expect(calls[0]?.url).toContain(`/${GRAPH_VERSION}/106022465447849`)
    expect(calls[0]?.url).toContain('fields=name%2Cfan_count')
  })

  it('publishes a page photo in one call', async () => {
    const { fetchImpl, calls } = mockGraph([() => ({ body: { id: 'photo1', post_id: 'page_post1' } })])
    const client = createMetaClient({ accessToken: 'token', fetchImpl })

    const result = await client.postPhotoToPage('page1', {
      imageUrl: 'https://example.test/poster.png',
      message: 'Кашемир ороолт',
    })

    expect(result.post_id).toBe('page_post1')
    expect(calls).toHaveLength(1)
    expect(calls[0]?.body).toContain('published=true')
    expect(calls[0]?.body).toContain('message=%D0%9A%D0%B0%D1%88%D0%B5%D0%BC%D0%B8%D1%80')
  })

  it('schedules a page photo with an unpublished upload then a feed post', async () => {
    const { fetchImpl, calls } = mockGraph([
      () => ({ body: { id: 'photo1' } }),
      () => ({ body: { id: 'scheduled1' } }),
    ])
    const client = createMetaClient({ accessToken: 'token', fetchImpl })

    await client.schedulePhotoOnPage('page1', {
      imageUrl: 'https://example.test/poster.png',
      message: 'Тун удахгүй',
      scheduledAt: new Date('2026-09-24T10:00:00.000Z'),
    })

    expect(calls).toHaveLength(2)
    // Step one uploads without publishing.
    expect(calls[0]?.url).toContain('/photos')
    expect(calls[0]?.body).toContain('published=false')
    // Step two attaches it to a scheduled feed post.
    expect(calls[1]?.url).toContain('/feed')
    expect(calls[1]?.body).toContain('media_fbid')
    expect(calls[1]?.body).toContain(`scheduled_publish_time=${1790244000}`)
  })

  it('waits for the Instagram container before publishing', async () => {
    const sleep = vi.fn(async () => {})
    const { fetchImpl, calls } = mockGraph([
      () => ({ body: { id: 'container1' } }),
      () => ({ body: { status_code: 'IN_PROGRESS' } }),
      () => ({ body: { status_code: 'FINISHED' } }),
      () => ({ body: { id: 'ig_post1' } }),
    ])
    const client = createMetaClient({ accessToken: 'token', fetchImpl, sleep })

    const result = await client.postToInstagram('ig1', {
      imageUrl: 'https://example.test/poster.png',
      caption: 'Шинэ бараа',
    })

    expect(result.id).toBe('ig_post1')
    expect(sleep).toHaveBeenCalledTimes(1)
    expect(calls).toHaveLength(4)
    expect(calls[3]?.url).toContain('/media_publish')
    expect(calls[3]?.body).toContain('creation_id=container1')
  })

  it('never publishes when the container errors', async () => {
    const { fetchImpl, calls } = mockGraph([
      () => ({ body: { id: 'container1' } }),
      () => ({ body: { status_code: 'ERROR', status: 'Media download failed' } }),
    ])
    const client = createMetaClient({ accessToken: 'token', fetchImpl, sleep: async () => {} })

    await expect(
      client.postToInstagram('ig1', { imageUrl: 'https://example.test/poster.png' }),
    ).rejects.toThrow('error')
    expect(calls).toHaveLength(2)
  })

  it('gives up if the container never finishes', async () => {
    let clock = new Date('2026-09-23T10:00:00.000Z').getTime()
    const { fetchImpl } = mockGraph([
      () => ({ body: { id: 'container1' } }),
      () => ({ body: { status_code: 'IN_PROGRESS' } }),
    ])
    const client = createMetaClient({
      accessToken: 'token',
      fetchImpl,
      sleep: async () => {
        clock += 20_000
      },
      now: () => new Date(clock),
    })

    await expect(
      client.postToInstagram('ig1', { imageUrl: 'https://example.test/poster.png' }),
    ).rejects.toThrow('did not finish')
  })

  it('surfaces a Graph API error with its code', async () => {
    const { fetchImpl } = mockGraph([
      () => ({
        status: 400,
        body: { error: { message: 'Invalid OAuth access token', code: 190, error_subcode: 463 } },
      }),
    ])
    const client = createMetaClient({ accessToken: 'expired', fetchImpl })

    await expect(client.getPage('page1')).rejects.toBeInstanceOf(MetaApiError)
    await expect(client.getPage('page1')).rejects.toThrow('Invalid OAuth access token')
  })

  it('masks the access token in the log', async () => {
    const entries: { requestSummary: Record<string, unknown> }[] = []
    const { fetchImpl } = mockGraph([() => ({ body: { id: '1', name: 'Cora' } })])
    const client = createMetaClient({
      accessToken: 'EAABsbCS1iHgBO7ZC8verysecrettoken',
      fetchImpl,
      log: (entry) => {
        entries.push(entry)
      },
    })

    await client.getPage('page1')

    expect(entries).toHaveLength(1)
    expect(entries[0]?.requestSummary.access_token).toBe('EAAB…oken')
    expect(JSON.stringify(entries[0])).not.toContain('verysecrettoken')
  })

  it('logs failures too', async () => {
    const entries: { error: string | null; statusCode: number | null }[] = []
    const { fetchImpl } = mockGraph([
      () => ({ status: 400, body: { error: { message: 'Permission denied', code: 200 } } }),
    ])
    const client = createMetaClient({
      accessToken: 'token',
      fetchImpl,
      log: (entry) => {
        entries.push(entry)
      },
    })

    await expect(client.getPage('page1')).rejects.toThrow()
    expect(entries[0]?.error).toBe('Permission denied')
    expect(entries[0]?.statusCode).toBe(400)
  })

  it('reads the Instagram publishing limit', async () => {
    const { fetchImpl } = mockGraph([
      () => ({ body: { data: [{ quota_usage: 12, config: { quota_total: 100 } }] } }),
    ])
    const client = createMetaClient({ accessToken: 'token', fetchImpl })

    expect(await client.getInstagramPublishingLimit('ig1')).toEqual({ used: 12, total: 100 })
  })

  it('finds the Instagram account attached to a page', async () => {
    const { fetchImpl } = mockGraph([
      () => ({ body: { instagram_business_account: { id: 'ig1', username: 'zr_originalsneaker' } } }),
    ])
    const client = createMetaClient({ accessToken: 'token', fetchImpl })

    expect(await client.getInstagramAccount('page1')).toEqual({
      id: 'ig1',
      username: 'zr_originalsneaker',
    })
  })

  it('returns null when a page has no Instagram account', async () => {
    const { fetchImpl } = mockGraph([() => ({ body: {} })])
    const client = createMetaClient({ accessToken: 'token', fetchImpl })

    expect(await client.getInstagramAccount('page1')).toBeNull()
  })
})
