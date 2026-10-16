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
          background: '#050507',
          position: 'relative',
        }}
      >
        {/* Monolithic SCENOVA Pure-White Geometric Emblem (#FFFFFF) */}
        <svg
          width="112"
          height="98"
          viewBox="0 0 32 28"
          fill="none"
        >
          <g fill="#FFFFFF">
            <path
              d="M 4 13 C 4 6.37 9.37 1 16 1 L 27.5 1 C 29.43 1 31 2.57 31 4.5 C 31 6.43 29.43 8 27.5 8 L 16.5 8 C 13.46 8 11 10.46 11 13.5 C 11 14.33 10.33 15 9.5 15 L 5.5 15 C 4.67 15 4 14.33 4 13.5 Z"
            />
            <path
              d="M 28 15 C 28 21.63 22.63 27 16 27 L 4.5 27 C 2.57 27 1 25.43 1 23.5 C 1 21.57 2.57 20 4.5 20 L 15.5 20 C 18.54 20 21 17.54 21 14.5 C 21 13.67 21.67 13 22.5 13 L 26.5 13 C 27.33 13 28 13.67 28 14.5 Z"
            />
          </g>
        </svg>
      </div>
    ),
    {
      ...size,
    }
  )
}
