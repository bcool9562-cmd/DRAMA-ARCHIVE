import { ImageResponse } from 'next/og'

export const size = {
  width: 180,
  height: 180,
}
export const contentType = 'image/png'

export default function AppleIcon() {
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
          borderRadius: 42,
          border: '2px solid rgba(244, 63, 94, 0.45)',
          position: 'relative',
        }}
      >
        {/* Soft pink ambient halo */}
        <div
          style={{
            position: 'absolute',
            width: 100,
            height: 100,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(244,63,94,0.65) 0%, rgba(236,72,153,0.3) 50%, transparent 75%)',
          }}
        />

        {/* Frosted Rose-Pink Glass Frame */}
        <div
          style={{
            width: 124,
            height: 124,
            borderRadius: 30,
            background: 'linear-gradient(135deg, rgba(236,72,153,0.3) 0%, rgba(244,63,94,0.2) 50%, rgba(192,38,211,0.3) 100%)',
            border: '1.5px solid rgba(255, 255, 255, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          {/* 4-Point Star-Prism / Cinema Aperture */}
          <svg
            width="90"
            height="90"
            viewBox="0 0 256 256"
            fill="none"
          >
            <path
              d="M 128 0 C 128 70 70 128 0 128 C 70 128 128 186 128 256 C 128 186 186 128 256 128 C 186 128 128 70 128 0 Z"
              fill="#FFFFFF"
            />
            <path
              d="M 128 0 C 128 70 186 128 256 128 C 186 128 128 186 128 256 L 128 0 Z"
              fill="#FB7185"
              fillOpacity="0.9"
            />
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
