'use client'

interface ScenovaLogoProps {
  className?: string
}

/**
 * SCENOVA Pure-White Organic Rounded Emblem (#FFFFFF)
 *
 * Smooth, plump, puffy organic rounded silhouette in pure #FFFFFF
 * (symmetrical 4-lobed rounded cloud-prism / soft pinched-waist infinity-cushion)
 * with continuous bezier curves and zero sharp corners.
 */
export default function ScenovaLogo({ className = 'w-9 h-7 text-white fill-white' }: ScenovaLogoProps) {
  return (
    <svg
      viewBox="0 0 36 28"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M 18 7 C 22.5 7 24.5 2.5 28.5 2.5 C 32.5 2.5 35 5.5 35 9.5 C 35 12 33 13.2 31.5 14 C 33 14.8 35 16 35 18.5 C 35 22.5 32.5 25.5 28.5 25.5 C 24.5 25.5 22.5 21 18 21 C 13.5 21 11.5 25.5 7.5 25.5 C 3.5 25.5 1 22.5 1 18.5 C 1 16 3 14.8 4.5 14 C 3 13.2 1 12 1 9.5 C 1 5.5 3.5 2.5 7.5 2.5 C 11.5 2.5 13.5 7 18 7 Z"
        fill="#FFFFFF"
      />
    </svg>
  )
}
