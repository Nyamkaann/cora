// Browser only helpers. Images are shrunk before upload so Storage stays small.

export const MAX_IMAGE_DIMENSION = 2000

export type PreparedImage = {
  blob: Blob
  extension: string
  /** True when a PNG actually carries transparency (poster ready). */
  hasAlpha: boolean
}

function extensionFor(type: string, fileName: string): string {
  if (type === 'image/png') return 'png'
  if (type === 'image/webp') return 'webp'
  if (type === 'image/jpeg') return 'jpg'
  const fromName = fileName.split('.').pop()
  return fromName && fromName.length <= 5 ? fromName.toLowerCase() : 'jpg'
}

function detectAlpha(context: CanvasRenderingContext2D, width: number, height: number): boolean {
  const { data } = context.getImageData(0, 0, width, height)
  // Every 4th byte is alpha. Step over pixels for speed on large images.
  for (let index = 3; index < data.length; index += 4 * 16) {
    const alpha = data[index]
    if (alpha !== undefined && alpha < 250) return true
  }
  return false
}

export async function prepareImage(file: File): Promise<PreparedImage> {
  const extension = extensionFor(file.type, file.name)
  const isPng = file.type === 'image/png'

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    return { blob: file, extension, hasAlpha: false }
  }

  const longestSide = Math.max(bitmap.width, bitmap.height)
  const scale = longestSide > MAX_IMAGE_DIMENSION ? MAX_IMAGE_DIMENSION / longestSide : 1
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')

  if (!context) {
    bitmap.close()
    return { blob: file, extension, hasAlpha: false }
  }

  context.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const hasAlpha = isPng ? detectAlpha(context, width, height) : false

  if (scale === 1) {
    return { blob: file, extension, hasAlpha }
  }

  const type = isPng ? 'image/png' : 'image/jpeg'
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.9))

  return {
    blob: blob ?? file,
    extension: isPng ? 'png' : 'jpg',
    hasAlpha,
  }
}
