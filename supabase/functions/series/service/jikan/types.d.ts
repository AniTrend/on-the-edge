import { AnimeResource, MangaResource } from './remote/types.d.ts';

export type JikanAnime = AnimeResource;

export type JikanManga = MangaResource;

export type Jikan = JikanAnime | JikanManga;
