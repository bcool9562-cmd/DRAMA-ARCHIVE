// Persistent VAPID Web Push Configuration for SCENOVA

export const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  'BH35OGIjDPYayEKTxMXNXJNbgTA8lnTWPot6T2chkmpG13JAziIp9b07rH7nHJMTvlnWN_GwvLGeN79X50-7juQ'

export const VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY ||
  'aw04gPmtvEVcwnpgWS3hcgFkZqh_OfXBlrs7dQFoA-M'

export const VAPID_SUBJECT =
  process.env.VAPID_SUBJECT ||
  'mailto:alerts@scenova.app'

/**
 * Utility to convert base64 url-safe public key to Uint8Array for PushManager.subscribe
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}
