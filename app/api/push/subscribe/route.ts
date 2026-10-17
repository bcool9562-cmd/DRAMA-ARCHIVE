import { NextRequest, NextResponse } from 'next/server'
import { upsertSubscription } from '@/lib/pushServer'
import { VAPID_PUBLIC_KEY } from '@/lib/vapidKeys'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({
    publicKey: VAPID_PUBLIC_KEY,
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { subscription, dramaTitles } = body

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json({ error: 'Invalid push subscription object' }, { status: 400 })
    }

    const all = await upsertSubscription(subscription, dramaTitles)
    return NextResponse.json({
      success: true,
      activeSubscribers: all.filter((s) => s.active).length,
    })
  } catch (error: any) {
    console.error('[POST /api/push/subscribe error]:', error)
    return NextResponse.json({ error: error.message || 'Subscription failed' }, { status: 500 })
  }
}
