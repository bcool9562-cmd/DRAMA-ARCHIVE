/**
 * Client-safe image URL helpers for TMDB images.
 * Pure string manipulations — safe in both client and server environments.
 */

export function tmdbImg(
  path: string | null | undefined,
  size: 'w342' | 'w780' | 'original' = 'original'
): string {
  if (!path) return ''
  if (path.startsWith('http')) {
    if (size !== 'original' && path.includes('/t/p/original/')) {
      return path.replace('/t/p/original/', `/t/p/${size}/`)
    }
    return path
  }
  return `https://image.tmdb.org/t/p/${size}${path}`
}

export function tmdbThumb(path: string | null | undefined): string {
  return tmdbImg(path, 'w342')
}

export function tmdbCard(path: string | null | undefined): string {
  return tmdbImg(path, 'w780')
}

export function tmdbOriginal(path: string | null | undefined): string {
  return tmdbImg(path, 'original')
}
