export type DramaStatus = 'watchlist' | 'watching' | 'finished'

export interface DramaCast {
  name: string
  character?: string
  profileUrl?: string
}

export interface Drama {
  dramaId: string
  tmdbId: number
  title: string
  nativeTitle?: string
  posterUrl?: string
  backdropUrl?: string
  releaseYear?: number | string
  totalEpisodes?: number
  country?: string
  overview?: string
  genres?: string[]
  cast?: DramaCast[]
  score?: number
  vibe?: {
    score: number
    label: string
  }
  status?: DramaStatus
  userRating?: number
  airingStatus?: string
  nextEpisodeDate?: string
  nextEpisodeNumber?: number
}

export interface ArchiveItem {
  id?: string
  user_id?: string
  drama_id: string
  title: string
  native_title?: string
  poster_url?: string
  backdrop_url?: string
  release_year?: number | string
  total_episodes?: number
  country?: string
  status: DramaStatus
  rating?: number
  vibe?: number
  vibe_label?: string
  watched_episodes?: number
  airing_status?: string
  next_episode_date?: string
  next_episode_number?: number
  notes?: string
  updated_at?: string
}

export interface DiscoverRow {
  id: string
  title: string
  dramas: Drama[]
}

export interface DiscoverResponse {
  hero: Drama[]
  talkOfTheTown: Drama[]
  rows: DiscoverRow[]
}

export interface DramaAlert {
  dramaId: string
  title: string
  posterUrl?: string
  airingDate?: string
  message: string
  type: 'upcoming' | 'ongoing'
}
