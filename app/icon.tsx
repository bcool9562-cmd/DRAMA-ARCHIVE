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
          position: 'relative',
        }}
      >
        {/* Monolithic SCENOVA Pure-White Organic Rounded Emblem (#FFFFFF) */}
        <svg
          width="324"
          height="252"
          viewBox="0 0 36 28"
          fill="none"
        >
          <path
            d="M 18 7 C 22.5 7 24.5 2.5 28.5 2.5 C 32.5 2.5 35 5.5 35 9.5 C 35 12 33 13.2 31.5 14 C 33 14.8 35 16 35 18.5 C 35 22.5 32.5 25.5 28.5 25.5 C 24.5 25.5 22.5 21 18 21 C 13.5 21 11.5 25.5 7.5 25.5 C 3.5 25.5 1 22.5 1 18.5 C 1 16 3 14.8 4.5 14 C 3 13.2 1 12 1 9.5 C 1 5.5 3.5 2.5 7.5 2.5 C 11.5 2.5 13.5 7 18 7 Z"
            fill="#FFFFFF"
          />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  )
}
