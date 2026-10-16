'use client'

interface ScenovaLogoProps {
  className?: string
}

/**
 * SCENOVA Pure-White Geometric Emblem (#FFFFFF)
 *
 * Monolithic architectural mark formed by two heavy, rounded-corner interlocking
 * abstract S-frames / cinema capsules angled around a crisp negative-space cut.
 * 100% solid white, thick geometry, no colors, no gradients, no play triangle.
 */
export default function ScenovaLogo({ className = 'w-8 h-7 text-white fill-current' }: ScenovaLogoProps) {
  return (
    <svg
      viewBox="0 0 32 28"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Upper heavy capsule hook */}
      <path
        d="M 4 13 C 4 6.37 9.37 1 16 1 L 27.5 1 C 29.43 1 31 2.57 31 4.5 C 31 6.43 29.43 8 27.5 8 L 16.5 8 C 13.46 8 11 10.46 11 13.5 C 11 14.33 10.33 15 9.5 15 L 5.5 15 C 4.67 15 4 14.33 4 13.5 Z"
      />
      {/* Lower heavy capsule hook (180° rotational symmetry) */}
      <path
        d="M 28 15 C 28 21.63 22.63 27 16 27 L 4.5 27 C 2.57 27 1 25.43 1 23.5 C 1 21.57 2.57 20 4.5 20 L 15.5 20 C 18.54 20 21 17.54 21 14.5 C 21 13.67 21.67 13 22.5 13 L 26.5 13 C 27.33 13 28 13.67 28 14.5 Z"
      />
    </svg>
  )
}
