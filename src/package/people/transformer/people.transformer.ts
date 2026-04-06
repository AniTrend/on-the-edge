import type { JikanPerson } from '@scope/service/jikan';
import type { PeopleDocument } from '../people.types.ts';

const PEOPLE_TTL_DAYS = 7;
const SECONDS_PER_DAY = 86_400;

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

export function peopleTransform(person: JikanPerson): PeopleDocument {
  const now = nowSeconds();
  const expiresAt = now + PEOPLE_TTL_DAYS * SECONDS_PER_DAY;

  return {
    malId: person.mal_id,
    name: person.name,
    givenName: person.given_name ?? null,
    familyName: person.family_name ?? null,
    alternateNames: person.alternate_names ?? [],
    birthday: person.birthday ?? null,
    favorites: person.favorites,
    about: person.about ?? null,
    imageUrl: person.images.jpg.image_url ?? null,
    websiteUrl: person.website_url ?? null,
    fetchedAt: now,
    expiresAt,
  };
}
