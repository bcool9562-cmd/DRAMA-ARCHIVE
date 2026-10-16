'use client'

interface ScenovaLogoProps {
  className?: string
  showBacklight?: boolean
}

/**
 * SCENOVA Pink-Shade Gaussian-Blurred Glass Logo Icon
 *
 * A sleek frosted rose-pink glass squircle with soft Gaussian-blurred pink-rose halo
 * and an original custom SVG 4-Point Star-Prism / Cinema Aperture in crisp white and rose-pink.
 */
export default function ScenovaLogo({
  className = 'w-9 h-9',
  showBacklight = true,
}: ScenovaLogoProps) {
  return (
    <div className={`relative ${className} flex-shrink-0 flex items-center justify-center select-none`}>
      {/* Soft Gaussian-blurred pink-rose halo behind */}
      {showBacklight && (
        <div className="absolute -inset-1.5 rounded-2xl bg-gradient-to-r from-pink-500/50 via-rose-500/40 to-fuchsia-500/50 blur-md -z-10 pointer-events-none" />
      )}

      {/* Sleek frosted rose-pink glass squircle */}
      <div className="relative w-full h-full rounded-[12px] bg-gradient-to-br from-pink-500/25 via-rose-500/20 to-fuchsia-600/25 backdrop-blur-xl border border-pink-400/40 flex items-center justify-center shadow-[0_0_24px_rgba(244,63,94,0.45),inset_0_1px_1px_rgba(255,255,255,0.45)] overflow-hidden">
        {/* Subtle inner radial sheen */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.35)_0%,transparent_60%)] pointer-events-none" />

        {/* 4-Point Star-Prism / Cinema Aperture in crisp white & rose-pink */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-5 h-5 relative z-10 drop-shadow-[0_0_8px_rgba(244,63,94,0.65)]"
          aria-hidden="true"
        >
          {/* Subtle luminous ambient core */}
          <circle cx="12" cy="12" r="4.5" fill="#f43f5e" fillOpacity="0.4" />

          {/* Primary 4-Point Star Prism - Left & Top Facets in Crisp White */}
          <path
            d="M 12 2.5 C 12 7.7 7.7 12 2.5 12 C 7.7 12 12 16.3 12 21.5 C 12 16.3 16.3 12 21.5 12 C 16.3 12 12 7.7 12 2.5 Z"
            fill="#FFFFFF"
          />

          {/* 3D Prism Aperture Facet - Right & Bottom in Rose-Pink */}
          <path
            d="M 12 2.5 C 12 7.7 16.3 12 21.5 12 C 16.3 12 12 16.3 12 21.5 L 12 2.5 Z"
            fill="#FB7185"
            fillOpacity="0.85"
          />

          {/* Precision Radiant Core */}
          <circle cx="12" cy="12" r="1.6" fill="#FFFFFF" />
        </svg>
      </div>
    </div>
  )
}
