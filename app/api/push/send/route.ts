import { NextRequest, NextResponse } from 'next/server'
import { sendWebPushToAll } from '@/lib/pushServer'
import { generateWittyDramaNotification, DramaNotificationPayload } from '@/lib/dramaNotifications'

export const dynamic = 'force-dynamic'

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const delayMs = parseInt(searchParams.get('delay') || '0', 10)

  if (delayMs > 0 && delayMs <= 30000) {
    await wait(delayMs)
  }

  const payload: DramaNotificationPayload = generateWittyDramaNotification()
  const result = await sendWebPushToAll(payload)

  return NextResponse.json({
    success: true,
    notification: payload,
    result,
  })
}

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const delayMs = parseInt(searchParams.get('delay') || '0', 10)

    let bodyData: any = {}
    try {
      bodyData = await req.json()
    } catch {
      // empty body is fine
    }

    if (delayMs > 0 && delayMs <= 30000) {
      await wait(delayMs)
    }

    const payload: DramaNotificationPayload =
      bodyData.title && bodyData.body
        ? bodyData
        : generateWittyDramaNotification(bodyData.context)

    const result = await sendWebPushToAll(payload)

    return NextResponse.json({
      success: true,
      notification: payload,
      result,
    })
  } catch (error: any) {
    console.error('[POST /api/push/send error]:', error)
    return NextResponse.json({ error: error.message || 'Push send failed' }, { status: 500 })
  }
}
