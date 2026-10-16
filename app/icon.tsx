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
          background: '#050507',
          borderRadius: 124,
          position: 'relative',
        }}
      >
        {/* Crisp Circular Rose-Pink Gradient Emblem */}
        <div
          style={{
            width: 352,
            height: 352,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #e11d48 0%, #f472b6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Pure-White Interlocking Geometric Twin-Ring / Angled Cinema-Lens Cut */}
          <svg
            width="220"
            height="220"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M 6.5 11.5 A 5.5 5.5 0 1 1 17.5 12" />
            <path d="M 17.5 12.5 A 5.5 5.5 0 1 1 6.5 12" />
            <path d="M 7.5 16.5 L 16.5 7.5" />
          </svg>
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
