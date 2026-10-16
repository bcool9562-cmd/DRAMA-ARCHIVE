'use client'

interface ScenovaLogoProps {
  className?: string
}

/**
 * SCENOVA Circular Brand Emblem
 *
 * Clean, sharp circular emblem (w-8 h-8 rounded-full bg-gradient-to-tr from-rose-600 to-pink-400)
 * with zero outer blur/glow, containing a crisp pure-white interlocking geometric twin-ring /
 * angled cinema-lens cut SVG inside. Matches the clean, sharp weight of the Explore icon.
 */
export default function ScenovaLogo({ className = 'w-8 h-8' }: ScenovaLogoProps) {
  return (
    <div
      className={`${className} rounded-full bg-gradient-to-tr from-rose-600 to-pink-400 flex items-center justify-center flex-shrink-0 shadow-sm select-none`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-4.5 h-4.5 text-white"
        aria-hidden="true"
      >
        {/* Upper angled cinema ring / aperture arc */}
        <path d="M 6.5 11.5 A 5.5 5.5 0 1 1 17.5 12" />
        {/* Lower angled cinema ring / aperture arc */}
        <path d="M 17.5 12.5 A 5.5 5.5 0 1 1 6.5 12" />
        {/* Angled cinema-lens aperture cut */}
        <path d="M 7.5 16.5 L 16.5 7.5" />
      </svg>
    </div>
  )
}
