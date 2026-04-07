import { describe, it } from '@std/testing/bdd';
import { assertEquals, assertRejects, assertThrows } from '@std/assert';
import { spy } from '@std/testing/mock';
import { BadRequestException, NotFoundException } from '@danet/core';
import { CharacterService } from './character.service.ts';
import { CharacterRepository } from './repository/index.ts';
import { createMockLogger } from '@scope/common/testing';
import { CharacterQuerySchema } from './character.schema.ts';
import type { CharacterDocument } from './character.types.ts';

const nowSeconds = () => Math.floor(Date.now() / 1000);

function makeCharacterDocument(
  overrides?: Partial<CharacterDocument>,
): CharacterDocument {
  const now = nowSeconds();
  return {
    malId: 1,
    name: 'Spike Spiegel',
    nameKanji: 'スパイク・スピーゲル',
    nicknames: ['Spike'],
    favorites: 48836,
    about: 'Bounty hunter aboard the Bebop.',
    imageUrl: 'https://cdn.test/character1.jpg',
    anime: [
      {
        malId: 1,
        role: 'Main',
        title: 'Cowboy Bebop',
        url: 'https://mal.test/anime/1',
        imageUrl: 'https://cdn.test/anime1.jpg',
      },
    ],
    manga: [
      {
        malId: 173,
        role: 'Main',
        title: 'Cowboy Bebop',
        url: 'https://mal.test/manga/173',
        imageUrl: 'https://cdn.test/manga173.jpg',
      },
    ],
    voices: [
      {
        malId: 11,
        name: 'Yamadera, Kouichi',
        language: 'Japanese',
        url: 'https://mal.test/people/11',
        imageUrl: 'https://cdn.test/person11.jpg',
      },
    ],
    fetchedAt: now,
    expiresAt: now + 86400 * 7,
    ...overrides,
  };
}

describe('CharacterService', () => {
  it('allows empty query objects at schema level', () => {
    assertEquals(CharacterQuerySchema.parse({}), {});
  });

  it('rejects non-positive MAL identifiers in query schema', () => {
    assertThrows(
      () => CharacterQuerySchema.parse({ malId: '0', name: 'Spike Spiegel' }),
      Error,
    );
  });

  it('parses positive integer MAL identifiers in query schema', () => {
    assertEquals(
      CharacterQuerySchema.parse({ malId: '1', name: 'Spike Spiegel' }),
      { malId: 1, name: 'Spike Spiegel' },
    );
  });

  it('throws BadRequestException when identifiers are missing', async () => {
    const { logger } = createMockLogger();
    const repository = {} as CharacterRepository;
    const service = new CharacterService(repository, logger);

    await assertRejects(
      () => service.aggregate({}),
      BadRequestException,
    );
  });

  it('throws NotFoundException when repository returns null', async () => {
    const { logger } = createMockLogger();
    const repository = {
      invoke: spy(async () => null),
    } as unknown as CharacterRepository;

    const service = new CharacterService(repository, logger);

    await assertRejects(
      () => service.aggregate({ malId: 1 }),
      NotFoundException,
    );
  });

  it('returns character document when resolved', async () => {
    const { logger } = createMockLogger();
    const { ObjectId } = await import('mongodb');
    const doc = { _id: new ObjectId(), ...makeCharacterDocument() };

    const repository = {
      invoke: spy(async () => doc),
    } as unknown as CharacterRepository;

    const service = new CharacterService(repository, logger);
    const result = await service.aggregate({ malId: 1 });

    assertEquals(result.malId, 1);
    assertEquals(result.name, 'Spike Spiegel');
    assertEquals(result.anime.length, 1);
    assertEquals(result.voices[0].language, 'Japanese');
  });

  it('passes name-only queries to repository when MAL id is unavailable', async () => {
    const { logger } = createMockLogger();
    const { ObjectId } = await import('mongodb');
    const doc = { _id: new ObjectId(), ...makeCharacterDocument() };

    const invokeSpy = spy(async () => doc);
    const repository = {
      invoke: invokeSpy,
    } as unknown as CharacterRepository;

    const service = new CharacterService(repository, logger);
    await service.aggregate({ name: 'Spike Spiegel' });

    assertEquals(invokeSpy.calls.length, 1);
    assertEquals(
      (invokeSpy.calls[0] as { args: unknown[] }).args,
      [undefined, 'Spike Spiegel'],
    );
  });

  it('passes both identifiers to repository when provided', async () => {
    const { logger } = createMockLogger();
    const { ObjectId } = await import('mongodb');
    const doc = { _id: new ObjectId(), ...makeCharacterDocument() };

    const invokeSpy = spy(async () => doc);
    const repository = {
      invoke: invokeSpy,
    } as unknown as CharacterRepository;

    const service = new CharacterService(repository, logger);
    await service.aggregate({ malId: 1, name: 'Spike Spiegel' });

    assertEquals(invokeSpy.calls.length, 1);
    assertEquals(
      (invokeSpy.calls[0] as { args: unknown[] }).args,
      [1, 'Spike Spiegel'],
    );
  });
});
