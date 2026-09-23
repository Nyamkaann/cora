// Cyrillic to latin map for Mongolian product names.
const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'j', з: 'z',
  и: 'i', й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', ө: 'o', п: 'p',
  р: 'r', с: 's', т: 't', у: 'u', ү: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch',
  ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
}

export function transliterate(input: string): string {
  return input
    .toLowerCase()
    .split('')
    .map((char) => CYRILLIC_TO_LATIN[char] ?? char)
    .join('')
}

/** "Оверсайз хүрэм" -> "oversize-hurem" */
export function slugify(input: string): string {
  return transliterate(input)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

/** Slug fragment for a SKU suffix: "300ml" -> "300ML", "M" -> "M". */
export function skuFragment(input: string): string {
  const cleaned = transliterate(input).replace(/[^a-z0-9]+/g, '')
  return cleaned.toUpperCase()
}

/** CORA-{product slug}-{variant value}, uppercased. */
export function suggestSku(productSlug: string, attributeValues: string[]): string {
  const base = `CORA-${skuFragment(productSlug)}`
  if (attributeValues.length === 0) return base
  return `${base}-${attributeValues.map(skuFragment).filter(Boolean).join('-')}`
}
