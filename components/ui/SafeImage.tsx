'use client'

import { useState, useEffect } from 'react'
import Image, { type ImageProps } from 'next/image'
import { resolveImageUrl, getProxyImageUrl } from '@/lib/image-utils'

export interface SafeImageProps extends Omit<ImageProps, 'src'> {
  src: string | null | undefined
  size?: 'w92' | 'w185' | 'w342' | 'w500' | 'w780' | 'original'
  proxyWidth?: number
  fallbackText?: string
  fallbackIcon?: React.ReactNode
  fallbackClassName?: string
}

export default function SafeImage({
  src,
  size = 'w500',
  proxyWidth = 500,
  alt,
  className,
  fallbackText,
  fallbackIcon,
  fallbackClassName,
  onError,
  ...rest
}: SafeImageProps) {
  const initialResolved = resolveImageUrl(src, size)
  const [currentSrc, setCurrentSrc] = useState(initialResolved)
  const [stage, setStage] = useState<'initial' | 'proxy' | 'failed'>(initialResolved ? 'initial' : 'failed')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const next = resolveImageUrl(src, size)
    setCurrentSrc(next)
    setStage(next ? 'initial' : 'failed')
    setLoaded(false)
  }, [src, size])

  if (stage === 'failed' || !currentSrc) {
    return (
      <div
        className={`flex h-full w-full items-center justify-center bg-[#12121a] border border-white/[0.08] text-white/20 select-none ${
          fallbackClassName || ''
        }`}
      >
        {fallbackIcon || (fallbackText ? <span className="text-[11px] font-medium">{fallbackText}</span> : null)}
      </div>
    )
  }

  const isProxy = currentSrc.includes('wsrv.nl') || currentSrc.includes('images.weserv.nl')

  return (
    <Image
      {...rest}
      src={currentSrc}
      alt={alt || ''}
      unoptimized={isProxy || rest.unoptimized}
      className={`${className || ''} ${loaded ? 'opacity-100' : 'opacity-90'} transition-opacity duration-200`}
      onLoad={(e) => {
        setLoaded(true)
        rest.onLoad?.(e)
      }}
      onError={(e) => {
        if (stage === 'initial' && currentSrc.includes('image.tmdb.org')) {
          // Retry immediately via wsrv.nl high-speed edge CDN proxy
          setStage('proxy')
          setCurrentSrc(getProxyImageUrl(currentSrc, proxyWidth))
        } else {
          // Final fallback: dark glass placeholder, never show broken icon
          setStage('failed')
        }
        onError?.(e)
      }}
    />
  )
}
