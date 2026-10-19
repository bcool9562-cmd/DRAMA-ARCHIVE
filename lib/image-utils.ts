/**
 * Client-safe image URL helpers for TMDB images.
 * Pure string manipulations — safe in both client and server environments.
 */

export function resolveImageUrl(
  path: string | null | undefined,
  size: 'w92' | 'w185' | 'w342' | 'w500' | 'w780' | 'original' = 'w500'
): string {
  if (!path || typeof path !== 'string') return ''
  let clean = path.trim()
  if (!clean) return ''

  // Fix any corrupted/duplicated prefixes (e.g. https://image.tmdb.org/t/p/w185https://image.tmdb.org/t/p/w342/...)
  const lastHttp = clean.lastIndexOf('http://')
  const lastHttps = clean.lastIndexOf('https://')
  const lastIdx = Math.max(lastHttp, lastHttps)
  if (lastIdx > 0) {
    clean = clean.slice(lastIdx)
  }

  // If already a full URL
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    if (clean.includes('image.tmdb.org/t/p/')) {
      return clean.replace(/\/t\/p\/(w\d+|original)\//, `/t/p/${size}/`)
    }
    return clean
  }

  // Raw relative TMDB path
  const leading = clean.startsWith('/') ? clean : `/${clean}`
  return `https://image.tmdb.org/t/p/${size}${leading}`
}

export function getProxyImageUrl(url: string, width = 500): string {
  if (!url || typeof url !== 'string') return ''
  const trimmed = url.trim()
  if (!trimmed) return ''
  if (trimmed.includes('wsrv.nl') || trimmed.includes('images.weserv.nl')) return trimmed
  return `https://wsrv.nl/?url=${encodeURIComponent(trimmed)}&w=${width}&output=webp`
}

export function tmdbImg(
  path: string | null | undefined,
  size: 'w92' | 'w185' | 'w342' | 'w500' | 'w780' | 'original' = 'w342'
): string {
  return resolveImageUrl(path, size)
}

export function tmdbThumb(path: string | null | undefined): string {
  return resolveImageUrl(path, 'w185')
}

export function tmdbCard(path: string | null | undefined): string {
  return resolveImageUrl(path, 'w342')
}

export function tmdbOriginal(path: string | null | undefined): string {
  return resolveImageUrl(path, 'original')
}
