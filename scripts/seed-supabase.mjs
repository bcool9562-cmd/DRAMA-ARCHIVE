import fs from 'fs'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://gxpvtjbeylymspfroccm.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_RR7eMxqDA9Bto6WplFSnsQ_HXIXaeob'
const FIXED_USER_ID = '00000000-0000-0000-0000-000000000001'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function main() {
  console.log('Reading data/user_dramas.json...')
  const raw = JSON.parse(fs.readFileSync('data/user_dramas.json', 'utf8'))

  // Filter 222 finished dramas deduplicated by drama_id
  const finishedMap = new Map()
  for (const d of raw) {
    if (d.status === 'finished') {
      const dramaId = String(d.drama_id)
      if (!finishedMap.has(dramaId)) {
        finishedMap.set(dramaId, d)
      }
    }
  }

  const finishedList = Array.from(finishedMap.values())
  console.log(`Found ${finishedList.length} unique finished dramas.`)

  const records = finishedList.map((d) => ({
    user_id: FIXED_USER_ID,
    drama_id: String(d.drama_id),
    tmdb_id: d.tmdb_id ? Number(d.tmdb_id) : null,
    title: String(d.title || ''),
    native_title: String(d.native_title || ''),
    poster_url: String(d.poster_url || ''),
    country: String(d.country || ''),
    release_year: d.release_year ? Number(d.release_year) : null,
    total_episodes: d.total_episodes ? Number(d.total_episodes) : null,
    rating: d.rating ? Number(d.rating) : 0,
    status: 'finished',
    airing_status: 'completed',
    first_air_date: d.first_air_date ? String(d.first_air_date).slice(0, 10) : null,
    next_episode_date: null,
    next_episode_number: null,
    updated_at: d.updated_at || new Date().toISOString(),
  }))

  console.log(`Upserting ${records.length} records into public.user_dramas_v2...`)

  // Upsert in batches of 50
  const BATCH_SIZE = 50
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE)
    const { data, error } = await supabase
      .from('user_dramas_v2')
      .upsert(batch, { onConflict: 'user_id,drama_id' })
      .select()

    if (error) {
      console.error(`Batch ${i} - ${i + batch.length} error:`, error)
      process.exit(1)
    } else {
      console.log(`Upserted batch ${i + 1} - ${Math.min(i + BATCH_SIZE, records.length)} (${data?.length} rows)`)
    }
  }

  console.log('\n--- VERIFYING ROW COUNT VIA SUPABASE REST API ---')
  const { count, error: countErr } = await supabase
    .from('user_dramas_v2')
    .select('*', { count: 'exact', head: true })

  if (countErr) {
    console.error('Count query error:', countErr)
  } else {
    console.log(`Total rows in public.user_dramas_v2: ${count}`)
  }
}

main().catch(console.error)
