import type { JikanCharacter } from '@scope/service/jikan';
import type { CharacterDocument } from '../character.types.ts';

const CHARACTER_TTL_DAYS = 7;
const SECONDS_PER_DAY = 86_400;

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

export function characterTransform(
  character: JikanCharacter,
): CharacterDocument {
  const now = nowSeconds();
  const expiresAt = now + CHARACTER_TTL_DAYS * SECONDS_PER_DAY;
  const animeRelations = character.anime ?? [];
  const mangaRelations = character.manga ?? [];
  const voiceRelations = character.voices ?? [];

  return {
    malId: character.mal_id,
    name: character.name,
    nameKanji: character.name_kanji ?? null,
    nicknames: character.nicknames ?? [],
    favorites: character.favorites,
    about: character.about ?? null,
    imageUrl: character.images.jpg.image_url ??
      character.images.webp.image_url ?? null,
    anime: animeRelations.map(({ role, anime }) => ({
      malId: anime.mal_id,
      role: role ?? null,
      title: anime.title,
      url: anime.url,
      imageUrl: anime.images.jpg.image_url ?? anime.images.webp.image_url ??
        null,
    })),
    manga: mangaRelations.map(({ role, manga }) => ({
      malId: manga.mal_id,
      role: role ?? null,
      title: manga.title,
      url: manga.url,
      imageUrl: manga.images.jpg.image_url ?? manga.images.webp.image_url ??
        null,
    })),
    voices: voiceRelations.map(({ person, language }) => ({
      malId: person.mal_id,
      name: person.name,
      language: language ?? null,
      url: person.url,
      imageUrl: person.images.jpg.image_url ?? null,
    })),
    fetchedAt: now,
    expiresAt,
  };
}
