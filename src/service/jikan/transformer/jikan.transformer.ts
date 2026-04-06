import type {
  AnimeResource,
  CharacterResource,
  MangaResource,
  PersonResource,
  ProducerResource,
} from '../jikan.types.ts';
import {
  JikanAnime,
  JikanCharacter,
  JikanManga,
  JikanPerson,
  JikanProducer,
} from '../types.ts';
import { Transform } from '@scope/common/transformer';

export const animeTransform: Transform<AnimeResource, JikanAnime> = (
  sourceData,
): JikanAnime => ({
  ...sourceData,
  moreinfo: sourceData.moreinfo ?? null,
});

export const mangaTransform: Transform<MangaResource, JikanManga> = (
  sourceData,
): JikanManga => ({
  ...sourceData,
  moreinfo: sourceData.moreinfo ?? null,
});

export const producerTransform: Transform<ProducerResource, JikanProducer> = (
  sourceData,
): JikanProducer => ({
  ...sourceData,
});

export const personTransform: Transform<PersonResource, JikanPerson> = (
  sourceData,
): JikanPerson => ({
  ...sourceData,
});

export const characterTransform: Transform<CharacterResource, JikanCharacter> =
  (
    sourceData,
  ): JikanCharacter => ({
    ...sourceData,
  });
