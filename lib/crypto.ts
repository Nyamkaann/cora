import 'server-only'

import { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from 'node:crypto'

/**
 * AES-256-GCM for the Meta access tokens. Tokens are never stored or logged in
 * plain text: only the output of encrypt() reaches the database.
 *
 * Payload layout, base64 encoded: version byte | 12 byte iv | 16 byte tag | ciphertext
 */

const VERSION = 1
const IV_LENGTH = 12
const TAG_LENGTH = 16

function encryptionKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY
  if (!raw) {
    throw new Error('ENCRYPTION_KEY is not set. Generate one with: openssl rand -base64 32')
  }

  const key = Buffer.from(raw, 'base64')
  if (key.length !== 32) {
    throw new Error(`ENCRYPTION_KEY must decode to 32 bytes, got ${key.length}`)
  }

  return key
}

export function encrypt(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])

  return Buffer.concat([Buffer.from([VERSION]), iv, cipher.getAuthTag(), ciphertext]).toString(
    'base64',
  )
}

export function decrypt(payload: string): string {
  const raw = Buffer.from(payload, 'base64')
  if (raw.length < 1 + IV_LENGTH + TAG_LENGTH) {
    throw new Error('Encrypted payload is too short')
  }

  const version = raw[0]
  if (version !== VERSION) {
    throw new Error(`Unsupported encrypted payload version: ${version}`)
  }

  const iv = raw.subarray(1, 1 + IV_LENGTH)
  const tag = raw.subarray(1 + IV_LENGTH, 1 + IV_LENGTH + TAG_LENGTH)
  const ciphertext = raw.subarray(1 + IV_LENGTH + TAG_LENGTH)

  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), iv)
  decipher.setAuthTag(tag)

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
}

/** Constant time compare, for webhook signatures and the cron secret. */
export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

/** "EAAB…B1ZD" — enough to recognise a token in a log without exposing it. */
export function maskSecret(value: string | null | undefined): string {
  if (!value) return ''
  if (value.length <= 12) return '…'
  return `${value.slice(0, 4)}…${value.slice(-4)}`
}
