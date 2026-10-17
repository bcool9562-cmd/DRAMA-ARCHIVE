/**
 * Client-safe image URL helpers for TMDB images.
 * Pure string manipulations — safe in both client and server environments.
 */

export function tmdbImg(
  path: string | null | undefined,
  size: 'w185' | 'w342' | 'w500' | 'w780' | 'original' = 'w342'
): string {
  if (!path) return ''
  if (path.startsWith('http')) {
    if (size !== 'original') {
      return path.replace(/\/t\/p\/(original|w780|w500|w342|w185)\//, `/t/p/${size}/`)
    }
    return path
  }
  return `https://image.tmdb.org/t/p/${size}${path}`
}

export function tmdbThumb(path: string | null | undefined): string {
  return tmdbImg(path, 'w185')
}

export function tmdbCard(path: string | null | undefined): string {
  return tmdbImg(path, 'w342')
}

export function tmdbOriginal(path: string | null | undefined): string {
  return tmdbImg(path, 'original')
}
