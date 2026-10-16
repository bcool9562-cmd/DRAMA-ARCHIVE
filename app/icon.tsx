import { ImageResponse } from 'next/og'

export const size = {
  width: 512,
  height: 512,
}
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#08080c',
          borderRadius: 124,
          border: '4px solid rgba(244, 63, 94, 0.45)',
          position: 'relative',
        }}
      >
        {/* Soft pink ambient halo */}
        <div
          style={{
            position: 'absolute',
            width: 280,
            height: 280,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(244,63,94,0.65) 0%, rgba(236,72,153,0.3) 50%, transparent 75%)',
          }}
        />

        {/* Frosted Rose-Pink Glass Frame */}
        <div
          style={{
            width: 352,
            height: 352,
            borderRadius: 84,
            background: 'linear-gradient(135deg, rgba(236,72,153,0.3) 0%, rgba(244,63,94,0.2) 50%, rgba(192,38,211,0.3) 100%)',
            border: '2.5px solid rgba(255, 255, 255, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          {/* 4-Point Star-Prism / Cinema Aperture */}
          <svg
            width="256"
            height="256"
            viewBox="0 0 256 256"
            fill="none"
          >
            {/* Primary Star - Left & Top Facets in Crisp White */}
            <path
              d="M 128 0 C 128 70 70 128 0 128 C 70 128 128 186 128 256 C 128 186 186 128 256 128 C 186 128 128 70 128 0 Z"
              fill="#FFFFFF"
            />
            {/* 3D Prism Aperture Facet - Right & Bottom in Rose-Pink */}
            <path
              d="M 128 0 C 128 70 186 128 256 128 C 186 128 128 186 128 256 L 128 0 Z"
              fill="#FB7185"
              fillOpacity="0.9"
            />
            {/* Precision Radiant Core */}
            <circle cx="128" cy="128" r="22" fill="#FFFFFF" />
          </svg>
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
