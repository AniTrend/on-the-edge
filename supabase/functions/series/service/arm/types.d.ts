interface Model {
  anidb: number | null;
  anilist: number | null;
  'anime-planet': string | null;
  anisearch: number | null;
  imdb: string | null;
  kitsu: number | null;
  livechart: number | null;
  'notify-moe': string | null;
  themoviedb: number | null;
  thetvdb: number | null;
  myanimelist: number | null;
}

interface IRelation {
  anidb: number | null;
  anilist: number | null;
  animePlanet: string | null;
  anisearch: number | null;
  imdb: string | null;
  kitsu: number | null;
  livechart: number | null;
  notify: string | null;
  themoviedb: number | null;
  thetvdb: number | null;
  myanimelist: number | null;
}

export type Relation = IRelation | null;
export type Relations = IRelation[];
