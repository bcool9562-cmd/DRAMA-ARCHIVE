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
          background: 'linear-gradient(135deg, #FF2E54 0%, #7928CA 52%, #0070F3 100%)',
          position: 'relative',
        }}
      >
        <svg
          width="114"
          height="114"
          viewBox="0 0 320 320"
          fill="none"
        >
          <g fill="#FFFFFF">
            <rect x="24" y="20" width="62" height="280" rx="20" />
            <path d="M 118 44 C 118 30 133 22 145 29 L 298 147 C 309 155 309 171 298 179 L 145 297 C 133 304 118 296 118 282 Z" />
          </g>
        </svg>
      </div>
    ),
    {
      ...size,
    }
  )
}
