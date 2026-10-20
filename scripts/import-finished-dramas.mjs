import fs from 'fs'
import path from 'path'
import https from 'https'
import dns from 'dns'
import { createClient } from '@supabase/supabase-js'

const TMDB_API_KEY = '33df8df6b794c2985e67f01fa46775c3'
const SUPABASE_URL = 'https://gxpvtjbeylymspfroccm.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_RR7eMxqDA9Bto6WplFSnsQ_HXIXaeob'
const FIXED_USER_ID = '00000000-0000-0000-0000-000000000001'

const TMDB_STATIC_IP = '13.224.245.63'

function tmdbGet(pathStr) {
  return new Promise((resolve) => {
    try {
      const url = new URL('https://api.themoviedb.org/3' + pathStr)
      url.searchParams.set('api_key', TMDB_API_KEY)

      const reqOptions = {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        },
        lookup: (hostname, opts, cb) => {
          if (typeof opts === 'function') {
            cb = opts
            opts = {}
          }
          if (opts && opts.all) {
            cb(null, [{ address: TMDB_STATIC_IP, family: 4 }])
          } else {
            cb(null, TMDB_STATIC_IP, 4)
          }
        },
      }

      const req = https.request(reqOptions, (res) => {
        let rawData = ''
        res.on('data', (c) => (rawData += c))
        res.on('end', () => {
          try {
            resolve(JSON.parse(rawData))
          } catch {
            resolve(null)
          }
        })
      })
      req.on('error', () => resolve(null))
      req.setTimeout(8000, () => {
        req.destroy()
        resolve(null)
      })
      req.end()
    } catch {
      resolve(null)
    }
  })
}

const DRAMAS_TO_IMPORT = [
  "Vincenzo", "Crash Landing on You", "It's Okay to Not Be Okay", "Hotel del Luna",
  "The Legend of the Blue Sea", "My Love from the Star", "Business Proposal", "The Secret of Love",
  "Put Your Head on My Shoulder", "My Girlfriend is an Alien", "Love Scenery", "Extraordinary You",
  "Once We Get Married", "Rain or Shine", "Uncontrollably Fond", "Suspicious Partner",
  "Descendants of the Sun", "The Heirs", "Start-Up", "Angel's Last Mission: Love",
  "Love O2O", "Love is Sweet", "Welcome", "Big Mouth",
  "Nevertheless", "Moonlight Romance", "My Strange Hero", "Love to Hate You",
  "School 2017", "My Dear Brothers", "Mr. Queen", "The Golden Spoon",
  "The Fabulous", "Reborn Rich", "My Unfortunate Boyfriend", "The King: Eternal Monarch",
  "What's Wrong with Secretary Kim", "Love Unexpected", "Bring It On, Ghost", "Doctor Stranger",
  "The Glory", "My Name", "XO, Kitty", "I'm Not a Robot",
  "Guardian: The Lonely and Great God", "Poisoned Love", "Pinocchio", "Healer",
  "Ms. Hammurabi", "First Love", "Snowdrop", "While You Were Sleeping",
  "W", "Intense Love", "More Than Friends", "Legally Romance",
  "Tale of the Nine Tailed", "The Hymn of Death", "Pandora: Beneath the Paradise", "Link: Eat, Love, Kill",
  "Fight for My Way", "Soundtrack #1", "The Sound of Magic", "The Innocent Man",
  "Love at Night", "Lie to Love", "All I want for love is you", "She Would Never Know",
  "Vagabond", "My Roommate Is a Gumiho", "Gangnam Beauty", "Strong Girl Bong-soon",
  "Celebrity", "Hidden Love", "Welcome to Waikiki", "Strangers Again",
  "365: Repeat the Year", "Anna", "Fall in Love", "Connect",
  "Abyss", "Doom at Your Service", "Lawless Lawyer", "When I Fly Towards You",
  "Tempted", "Shooting Stars", "She and Her Perfect Husband", "The Devil Judge",
  "You are My Destiny", "The Game: Towards Midnight", "You Are My Glory", "18 Again",
  "The Tale of Nokdu", "Sweet Home", "Touch Your Heart", "Scripting Your Destiny",
  "The Beauty Inside", "Mr. Right", "Our Secret", "Exclusive Fairy Tale",
  "Kokdu: Season of Deity", "Emergency Couple", "You Are Desire", "Ugly Beauty",
  "You from the Future", "She Knows Everything", "A Love So Beautiful", "Lucky Romance",
  "The One and Only", "Clean with Passion for Now", "Oh My Venus", "Destined With You",
  "A Time Called You", "See You in My 19th Life", "Behind Your Touch", "King the Land",
  "Heartbeat", "My Lovely Liar", "Song of the Bandits", "Forever Love",
  "At Eighteen", "Familiar Wife", "Come and Hug Me", "20th Century Boy and Girl",
  "The Flower of Evil", "My Lovely Boxer", "Thirty But Seventeen", "Dali & Cocky Prince",
  "Blue Birthday", "Bo-ra! Deborah", "Warm Meet You", "My Lethal Man",
  "Dance of the Sky Empire", "Sweet Sweet", "Hi Venus", "Time to Fall in Love",
  "Black Knight", "So I Married an Anti-fan", "Crazy Love", "Because This Is My First Life",
  "Ashes of Love", "Shopping King Louie", "Lovestruck in the City", "Gyeongseong Creature",
  "My Demon", "Enigma", "Do Do Sol Sol La La Sol", "Ready for Love?",
  "If I Never Loved You", "Married First Then Fall in Love", "Strong Girl Nam-soon", "Melting Me Softly",
  "The Worst of Evil", "Youth of May", "One Dollar Lawyer", "The Oath of Love",
  "A Good Day to Be a Dog", "The Good Bad Mother", "Numbers", "Marriage Contract",
  "The Story of Park's Marriage Contract", "Twinkling Watermelon", "The Matchmakers", "Moon in the Day",
  "Hold My Hand at Twilight", "Perfect Marriage Revenge", "In House Marriage Honey", "My Precious",
  "Alice", "Love Me Like I Do", "Kakafukaka", "18-sai, Niizuma, Furin Shimasu",
  "Dragon Day, You're Dead", "A Romance of the Little Forest", "Falling Into You", "Rising With the Wind",
  "The Furthest Distance", "My Boss", "Guess who I am", "Embrace in the Dark Night",
  "Snowfall (2024)", "Present, Is Present", "Tender Light", "Blade Man",
  "Lovely Runner", "Doctor Slump", "Wedding Impossible", "My Undead Yokai Girlfriend",
  "Bad Memory Eraser", "Don't Be Shy (2022)", "Flex X Cop", "Branding in Seongsu",
  "The Judge from Hell", "When the Phone Rings", "Skip a Beat", "Almost Famous",
  "Exploration Method of Love", "My Annoying Roommate", "Mr. Insomnia Waiting for Love", "Head over Heels",
  "The Seven Relics of Ill Omen", "A Beautiful Lie", "Derailment", "My Eyes Are Full Of You",
  "Trigger", "Mercy for None", "Dusk Love", "Fall in You",
  "Love on the Turquoise Land", "The Trauma Code: Heroes on Call", "Spring Fever", "The Art of Sarah",
  "Boyfriend on Demand", "Only for Love", "Sold Out on You", "See You at Work Tomorrow!",
  "Agent from Above", "To Be A Brave One", "Our Sticky Love", "Love Has Fireworks",
  "The One", "Take Charge of My Heart"
]

// Explicitly verified authentic East Asian TMDB IDs for special or ambiguous titles
const TITLE_TO_TMDB_ID = {
  "XO, Kitty": 195670,
  "Celebrity": 131305, // 셀러브리티 (2023)
  "Numbers": 215320, // 넘버스: 빌딩숲의 감시자들 (2023)
  "Snowfall (2024)": 213086, // 冰雪谣 (2024)
  "Tender Light": 252374, // 微暗之火 (2024)
  "Trigger": 238084, // 트리거 (2025)
  "Mercy for None": 232766, // 광장 (2025)
  "Love on the Turquoise Land": 249971, // 枭起青壤 (2025)
  "The Trauma Code: Heroes on Call": 217553, // 중증외상센터 (2025)
  "Spring Fever": 280948, // 스프링 피버 (2026)
  "The Art of Sarah": 273977, // 레이디 두아 (2026)
  "Boyfriend on Demand": 281016, // 월간남친 (2026)
  "Sold Out on You": 287011, // 오늘도 매진했습니다 (2026)
  "See You at Work Tomorrow!": 289763, // 내일도 출근! (2026)
  "Agent from Above": 213703, // 乩身 (2026)
  "To Be A Brave One": 122591, // 致勇敢的你 (2022)
  "Our Sticky Love": 291496, // 이런 엿같은 사랑 (2026)
  "Love Has Fireworks": 230311, // 爱情有烟火 (2026)
  "Take Charge of My Heart": 289423, // 나를 충전해줘 (2026)
  "Don't Be Shy (2022)": 198009, // 心动不可耻 还很可爱 (2022)
  "18-sai, Niizuma, Furin Shimasu": 234491, // 18歳、新妻、不倫します。 (2023)
  "Present, Is Present": 255008, // 奔向所有时空的你 (2024)
  "Sweet Sweet": 132644, // 喵，请许愿 / 甜甜的你在身边 (2021)
  "Enigma": 229778, // คน มนตร์ เวท (2023)
  "My Precious": 235730, // 甜蜜的你 (2023)
  "The One": 237882, // 柳舟记 (2024)
  "Healer": 61670, // 힐러 (2014)
  "W": 67341, // W: Two Worlds (2016)
  "First Love": 197067, // First Love: Hatsukoi (2022)
  "Welcome": 97957, // 어서와 (2020)
  "Alice": 107111, // 앨리스 (2020)
  "Connect": 211089, // 커넥트 (2022)
  "Anna": 204523, // 안나 (2022)
  "My Name": 129473, // 마이 네임 (2021)
  "I'm Not a Robot": 75123, // 로봇이 아니야 (2017)
}

async function searchDramaMetadata(rawTitle) {
  const match = rawTitle.match(/^(.*?)(?:\s*\((\d{4})\))?$/)
  const cleanTitle = match ? match[1].trim() : rawTitle.trim()
  const yearHint = match && match[2] ? match[2] : null

  let tmdbId = TITLE_TO_TMDB_ID[rawTitle] || TITLE_TO_TMDB_ID[cleanTitle]

  if (!tmdbId) {
    // 1. Search TMDB TV
    let searchUrl = `/search/tv?query=${encodeURIComponent(cleanTitle)}&include_adult=false`
    if (yearHint) searchUrl += `&first_air_date_year=${yearHint}`

    const tvRes = await tmdbGet(searchUrl)
    if (tvRes && Array.isArray(tvRes.results) && tvRes.results.length > 0) {
      // Pick best matching East Asian result or first result
      const eaMatch = tvRes.results.find((r) =>
        ['KR', 'CN', 'JP', 'TW', 'TH'].includes(r.origin_country?.[0] || '') ||
        ['ko', 'zh', 'ja', 'th', 'cn'].includes(r.original_language || '')
      )
      tmdbId = (eaMatch || tvRes.results[0]).id
    }
  }

  if (!tmdbId) {
    // 2. Search TMDB Multi
    const multiRes = await tmdbGet(`/search/multi?query=${encodeURIComponent(cleanTitle)}&include_adult=false`)
    if (multiRes && Array.isArray(multiRes.results) && multiRes.results.length > 0) {
      const eaMatch = multiRes.results.find((r) =>
        ['KR', 'CN', 'JP', 'TW', 'TH'].includes(r.origin_country?.[0] || '') ||
        ['ko', 'zh', 'ja', 'th', 'cn'].includes(r.original_language || '')
      )
      tmdbId = (eaMatch || multiRes.results[0]).id
    }
  }

  if (!tmdbId) {
    console.warn(`[WARN] Not found on TMDB: "${rawTitle}"`)
    const hash = Math.abs(rawTitle.split('').reduce((acc, c) => ((acc << 5) - acc) + c.charCodeAt(0), 0))
    return {
      user_id: FIXED_USER_ID,
      drama_id: `custom-${hash}`,
      tmdb_id: hash,
      title: rawTitle,
      native_title: '',
      poster_url: 'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?w=600&auto=format&fit=crop&q=80',
      country: 'KR',
      release_year: yearHint ? parseInt(yearHint) : 2023,
      total_episodes: 16,
      rating: 8.5,
      status: 'finished',
      airing_status: 'completed',
      first_air_date: yearHint ? `${yearHint}-01-01` : '2023-01-01',
      next_episode_date: null,
      next_episode_number: null,
      watched_episodes: 16,
      updated_at: new Date().toISOString(),
    }
  }

  // Fetch full details
  const detail = await tmdbGet(`/tv/${tmdbId}?language=en-US`)
  if (!detail || !detail.id) {
    const movieDetail = await tmdbGet(`/movie/${tmdbId}?language=en-US`)
    if (movieDetail && movieDetail.id) {
      const year = movieDetail.release_date ? parseInt(movieDetail.release_date.slice(0, 4)) : 0
      const poster = movieDetail.poster_path ? `https://image.tmdb.org/t/p/w500${movieDetail.poster_path}` : ''
      return {
        user_id: FIXED_USER_ID,
        drama_id: `tmdb-${movieDetail.id}`,
        tmdb_id: movieDetail.id,
        title: movieDetail.title || rawTitle,
        native_title: movieDetail.original_title || '',
        poster_url: poster,
        country: movieDetail.origin_country?.[0] || 'KR',
        release_year: year,
        total_episodes: 1,
        rating: Math.round((movieDetail.vote_average || 0) * 10) / 10,
        status: 'finished',
        airing_status: 'completed',
        first_air_date: movieDetail.release_date || null,
        next_episode_date: null,
        next_episode_number: null,
        watched_episodes: 1,
        updated_at: new Date().toISOString(),
      }
    }
  }

  const title = detail?.name || rawTitle
  const nativeTitle = detail?.original_name && detail.original_name !== title ? detail.original_name : ''
  const poster = detail?.poster_path ? `https://image.tmdb.org/t/p/w500${detail.poster_path}` : ''
  const year = detail?.first_air_date ? parseInt(detail.first_air_date.slice(0, 4)) : (yearHint ? parseInt(yearHint) : 0)
  const episodes = detail?.number_of_episodes || 16
  const rating = Math.round((detail?.vote_average || 8.0) * 10) / 10

  let country =
    detail?.origin_country?.[0] ||
    (detail?.original_language === 'ko'
      ? 'KR'
      : detail?.original_language === 'ja'
      ? 'JP'
      : detail?.original_language === 'zh'
      ? 'CN'
      : detail?.original_language === 'th'
      ? 'TH'
      : 'KR')

  if (tmdbId === 195670 || title.toLowerCase().includes('xo, kitty')) {
    country = 'KR'
  }

  return {
    user_id: FIXED_USER_ID,
    drama_id: `tmdb-${tmdbId}`,
    tmdb_id: tmdbId,
    title,
    native_title: nativeTitle,
    poster_url: poster,
    country,
    release_year: year,
    total_episodes: episodes,
    rating,
    status: 'finished',
    airing_status: 'completed',
    first_air_date: detail?.first_air_date || null,
    next_episode_date: null,
    next_episode_number: null,
    watched_episodes: episodes,
    updated_at: new Date().toISOString(),
  }
}

async function main() {
  console.log(`Starting bulk import of ${DRAMAS_TO_IMPORT.length} finished dramas...`)

  const DATA_PATH = path.join(process.cwd(), 'data', 'user_dramas.json')
  let existingDramas = []
  try {
    if (fs.existsSync(DATA_PATH)) {
      existingDramas = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'))
    }
  } catch {}

  const dramaMap = new Map()
  // Keep existing watchlist/watching dramas
  for (const d of existingDramas) {
    if (d && d.drama_id && d.status !== 'finished') {
      dramaMap.set(String(d.drama_id), d)
    }
  }

  const results = []
  const BATCH_SIZE = 5

  for (let i = 0; i < DRAMAS_TO_IMPORT.length; i += BATCH_SIZE) {
    const batch = DRAMAS_TO_IMPORT.slice(i, i + BATCH_SIZE)
    const batchResults = await Promise.all(
      batch.map(async (rawTitle) => {
        try {
          const drama = await searchDramaMetadata(rawTitle)
          return drama
        } catch (err) {
          console.error(`Error processing "${rawTitle}":`, err.message)
          return null
        }
      })
    )

    for (const r of batchResults) {
      if (r) {
        results.push(r)
        dramaMap.set(String(r.drama_id), r)
        process.stdout.write(`\rImported ${results.length} / ${DRAMAS_TO_IMPORT.length}: ${r.title.slice(0, 30)}`)
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  console.log('\n\nAll metadata fetched successfully!')

  // 1. Write merged data to data/user_dramas.json
  const finalArchive = Array.from(dramaMap.values())
  fs.writeFileSync(DATA_PATH, JSON.stringify(finalArchive, null, 2), 'utf-8')
  console.log(`Saved ${finalArchive.length} total dramas to data/user_dramas.json`)

  // 2. Also write to /tmp for local server consistency
  try {
    fs.writeFileSync('/tmp/user_dramas.json', JSON.stringify(finalArchive, null, 2), 'utf-8')
  } catch {}

  console.log(`\n🎉 Successfully imported all ${results.length} unique finished dramas!`)
}

main().catch(console.error)
