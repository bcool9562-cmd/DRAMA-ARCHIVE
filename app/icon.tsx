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
          backgroundColor: '#08080e',
          position: 'relative',
        }}
      >
        {/* Vibrant radial glow */}
        <div
          style={{
            position: 'absolute',
            top: '-10%',
            left: '-10%',
            width: '120%',
            height: '120%',
            background: 'radial-gradient(circle at 40% 35%, rgba(194, 72, 22, 0.45), rgba(99, 102, 241, 0.5) 45%, rgba(255, 64, 105, 0.35) 75%, transparent 100%)',
          }}
        />

        {/* Frosted Glass Squircle Inner Card */}
        <div
          style={{
            width: '420px',
            height: '420px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '96px',
            border: '3px solid rgba(255, 255, 255, 0.28)',
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            position: 'relative',
          }}
        >
          {/* Cinema Archive / Vault Prism Emblem */}
          <svg
            width="220"
            height="220"
            viewBox="0 0 100 100"
            fill="none"
          >
            {/* Hexagonal Prism Vault */}
            <path
              d="M50 14 L84 33 L84 67 L50 86 L16 67 L16 33 Z"
              stroke="rgba(255, 255, 255, 0.6)"
              strokeWidth="4"
              fill="rgba(255, 255, 255, 0.08)"
            />
            {/* Film Reel Circle */}
            <circle cx="50" cy="50" r="23" stroke="rgba(255, 255, 255, 0.75)" strokeWidth="3.5" />
            {/* Play Symbol */}
            <polygon
              points="45,40 62,50 45,60"
              fill="#ffffff"
            />
          </svg>
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
