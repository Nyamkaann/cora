/** Every server action returns this shape. */
export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: { message: string } }

export function actionError(message: string): { ok: false; error: { message: string } } {
  return { ok: false, error: { message } }
}

/** Turns a Postgres error into something an admin can act on. */
export function friendlyDbError(error: { code?: string; message: string }): string {
  if (error.code === '23505') {
    if (error.message.includes('sku')) return 'Ийм SKU аль хэдийн бүртгэгдсэн байна.'
    if (error.message.includes('attributes')) {
      return 'Нэг бараан дотор ижил сонголттой хувилбар давхардаж байна.'
    }
    if (error.message.includes('slug')) return 'Ийм slug-тай бараа аль хэдийн байна.'
    return 'Давхардсан утга байна.'
  }
  if (error.code === '23503') return 'Холбоотой бичлэг олдсонгүй.'
  return error.message
}
