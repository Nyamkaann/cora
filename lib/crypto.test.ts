import { beforeAll, describe, expect, it } from 'vitest'
import { randomBytes } from 'node:crypto'

import { decrypt, encrypt, maskSecret, safeEqual } from './crypto'

beforeAll(() => {
  process.env.ENCRYPTION_KEY = randomBytes(32).toString('base64')
})

describe('encrypt / decrypt', () => {
  it('round trips a token', () => {
    const token = 'EAABsbCS1iHgBO7ZC8example0token9value'
    expect(decrypt(encrypt(token))).toBe(token)
  })

  it('round trips Cyrillic and emoji', () => {
    const value = 'Кашемир ороолт · ₮ 98,000 🧣'
    expect(decrypt(encrypt(value))).toBe(value)
  })

  it('never returns the plaintext in the ciphertext', () => {
    const token = 'super-secret-page-token'
    expect(encrypt(token)).not.toContain(token)
  })

  it('produces a different payload every time', () => {
    const token = 'same-token'
    expect(encrypt(token)).not.toBe(encrypt(token))
  })

  it('rejects a tampered payload', () => {
    const payload = Buffer.from(encrypt('token'), 'base64')
    // Flip a bit in the ciphertext; GCM must refuse it.
    const last = payload.length - 1
    payload[last] = (payload[last] ?? 0) ^ 0x01
    expect(() => decrypt(payload.toString('base64'))).toThrow()
  })

  it('rejects a payload from a different key', () => {
    const payload = encrypt('token')
    const original = process.env.ENCRYPTION_KEY
    process.env.ENCRYPTION_KEY = randomBytes(32).toString('base64')
    expect(() => decrypt(payload)).toThrow()
    process.env.ENCRYPTION_KEY = original
  })

  it('rejects a truncated payload', () => {
    expect(() => decrypt('AAAA')).toThrow('too short')
  })

  it('refuses a key that is not 32 bytes', () => {
    const original = process.env.ENCRYPTION_KEY
    process.env.ENCRYPTION_KEY = randomBytes(16).toString('base64')
    expect(() => encrypt('token')).toThrow('32 bytes')
    process.env.ENCRYPTION_KEY = original
  })
})

describe('safeEqual', () => {
  it('matches identical strings', () => {
    expect(safeEqual('abc123', 'abc123')).toBe(true)
  })

  it('rejects different strings and different lengths', () => {
    expect(safeEqual('abc123', 'abc124')).toBe(false)
    expect(safeEqual('abc', 'abcd')).toBe(false)
  })
})

describe('maskSecret', () => {
  it('keeps only the ends', () => {
    expect(maskSecret('EAABsbCS1iHgBO7ZC8token')).toBe('EAAB…oken')
  })

  it('hides short values entirely', () => {
    expect(maskSecret('short')).toBe('…')
    expect(maskSecret(null)).toBe('')
  })
})
