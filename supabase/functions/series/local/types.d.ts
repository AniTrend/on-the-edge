import { Database } from '../../_shared/types/supabase.d.ts';

export type AnimeRelation = Pick<
  Database['public']['Tables']['anime_relation']['Row'],
  | 'anidb'
  | 'anilist'
  | 'anime_planet'
  | 'anisearch'
  | 'created_at'
  | 'id'
  | 'imdb'
  | 'livechart'
  | 'mal'
  | 'notify_moe'
  | 'shoboi'
  | 'tmdb'
  | 'trakt'
  | 'tvdb'
>;
