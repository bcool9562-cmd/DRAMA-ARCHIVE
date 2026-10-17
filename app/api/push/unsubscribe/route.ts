import { NextRequest, NextResponse } from 'next/server'
import { deactivateSubscription } from '@/lib/pushServer'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { endpoint } = body

    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint is required' }, { status: 400 })
    }

    await deactivateSubscription(endpoint)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[POST /api/push/unsubscribe error]:', error)
    return NextResponse.json({ error: error.message || 'Unsubscribe failed' }, { status: 500 })
  }
}
