// Server-Side Web Push Manager with Persistent Supabase Cloud + Local Storage

import webpush from 'web-push'
import { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } from './vapidKeys'
import { createAdminClient } from './supabase/admin'
import fs from 'fs'
import path from 'path'

// Configure web-push with VAPID credentials
try {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
} catch (e) {
  console.error('[webpush setVapidDetails error]:', e)
}

export interface StoredSubscription {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
  updatedAt: string
  active: boolean
  dramaTitles?: string[]
}

const STORAGE_BUCKET = 'drama_archive'
const STORAGE_FILE = 'push_subscriptions.json'
const DATA_DIR = path.join(process.cwd(), 'data')
const DATA_FILE = path.join(DATA_DIR, 'push_subscriptions.json')

// Memory cache for active server instance
let inMemorySubs: StoredSubscription[] = []

function readLocalSubs(): StoredSubscription[] {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
    if (!fs.existsSync(DATA_FILE)) return inMemorySubs
    const content = fs.readFileSync(DATA_FILE, 'utf-8')
    const parsed = JSON.parse(content)
    if (Array.isArray(parsed)) {
      inMemorySubs = parsed
      return parsed
    }
  } catch {
    // ignore
  }
  return inMemorySubs
}

function writeLocalSubs(subs: StoredSubscription[]) {
  inMemorySubs = subs
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
    fs.writeFileSync(DATA_FILE, JSON.stringify(subs, null, 2), 'utf-8')
  } catch {
    // Vercel serverless read-only filesystem handled gracefully
  }
}

export async function getAllSubscriptions(): Promise<StoredSubscription[]> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase.storage.from(STORAGE_BUCKET).download(STORAGE_FILE)
    if (!error && data) {
      const text = await data.text()
      const parsed = JSON.parse(text)
      if (Array.isArray(parsed)) {
        inMemorySubs = parsed
        return parsed
      }
    }
  } catch (e) {
    console.error('[getAllSubscriptions storage error]:', e)
  }
  return readLocalSubs()
}

export async function saveSubscriptions(subs: StoredSubscription[]): Promise<boolean> {
  writeLocalSubs(subs)
  try {
    const supabase = createAdminClient()
    const content = JSON.stringify(subs, null, 2)
    const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(STORAGE_FILE, content, {
      upsert: true,
      contentType: 'application/json',
    })
    return !error
  } catch (e) {
    console.error('[saveSubscriptions storage error]:', e)
    return true
  }
}

export async function upsertSubscription(sub: webpush.PushSubscription, dramaTitles?: string[]): Promise<StoredSubscription[]> {
  const all = await getAllSubscriptions()
  const existingIdx = all.findIndex((s) => s.endpoint === sub.endpoint)

  const newEntry: StoredSubscription = {
    endpoint: sub.endpoint,
    keys: {
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
    },
    updatedAt: new Date().toISOString(),
    active: true,
    dramaTitles: dramaTitles || [],
  }

  if (existingIdx >= 0) {
    all[existingIdx] = { ...all[existingIdx], ...newEntry }
  } else {
    all.push(newEntry)
  }

  await saveSubscriptions(all)
  return all
}

export async function deactivateSubscription(endpoint: string): Promise<boolean> {
  const all = await getAllSubscriptions()
  const filtered = all.map((s) => (s.endpoint === endpoint ? { ...s, active: false } : s))
  await saveSubscriptions(filtered)
  return true
}

export async function sendWebPushToAll(payload: any): Promise<{ sent: number; failed: number }> {
  const all = await getAllSubscriptions()
  const activeSubs = all.filter((s) => s.active)

  let sent = 0
  let failed = 0

  const bodyStr = typeof payload === 'string' ? payload : JSON.stringify(payload)

  const promises = activeSubs.map(async (sub) => {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: sub.keys,
        },
        bodyStr
      )
      sent++
    } catch (err: any) {
      failed++
      console.error('[sendWebPush error for endpoint]:', sub.endpoint, err?.statusCode || err?.message)
      // If subscription expired or was unregistered (410 or 404), mark inactive
      if (err?.statusCode === 410 || err?.statusCode === 404) {
        sub.active = false
      }
    }
  })

  await Promise.allSettled(promises)
  if (failed > 0) {
    await saveSubscriptions(all)
  }

  return { sent, failed }
}
