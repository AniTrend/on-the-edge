import type { JikanProducer } from '@scope/service/jikan';
import type { StudioDocument } from '../studio.types.ts';

const STUDIO_TTL_DAYS = 30;
const SECONDS_PER_DAY = 86_400;

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

export function studioTransform(
  anilistId: number,
  producer: JikanProducer,
): StudioDocument {
  const now = nowSeconds();
  const expiresAt = now + STUDIO_TTL_DAYS * SECONDS_PER_DAY;

  const defaultTitle = producer.titles.find((t) => t.type === 'Default')
    ?.title ??
    producer.titles[0]?.title ??
    'Unknown';

  return {
    anilistId,
    malId: producer.mal_id,
    titles: producer.titles.map((t) => ({ type: t.type, title: t.title })),
    name: defaultTitle,
    about: producer.about ?? null,
    established: producer.established ?? null,
    imageUrl: producer.images.jpg.image_url ?? null,
    favorites: producer.favorites,
    animeCount: producer.count,
    fetchedAt: now,
    expiresAt,
  };
}
