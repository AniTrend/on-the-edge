import { describe, it } from '@std/testing/bdd';
import { assertEquals, assertRejects, assertThrows } from '@std/assert';
import { spy } from '@std/testing/mock';
import { BadRequestException, NotFoundException } from '@danet/core';
import { PeopleService } from './people.service.ts';
import { PeopleRepository } from './repository/index.ts';
import { createMockLogger } from '@scope/common/testing';
import { PeopleQuerySchema } from './people.schema.ts';
import type { PeopleDocument } from './people.types.ts';

const nowSeconds = () => Math.floor(Date.now() / 1000);

function makePeopleDocument(
  overrides?: Partial<PeopleDocument>,
): PeopleDocument {
  const now = nowSeconds();
  return {
    malId: 10,
    name: 'Hayao Miyazaki',
    givenName: 'Hayao',
    familyName: 'Miyazaki',
    alternateNames: [],
    birthday: null,
    favorites: 20000,
    about: 'Director and co-founder of Studio Ghibli.',
    imageUrl: null,
    websiteUrl: null,
    fetchedAt: now,
    expiresAt: now + 86400 * 7,
    ...overrides,
  };
}

describe('PeopleService', () => {
  it('allows empty query objects at schema level', () => {
    assertEquals(PeopleQuerySchema.parse({}), {});
  });

  it('rejects non-positive MAL identifiers in query schema', () => {
    assertThrows(
      () => PeopleQuerySchema.parse({ malId: '0', name: 'Hayao Miyazaki' }),
      Error,
    );
  });

  it('parses positive integer MAL identifiers in query schema', () => {
    assertEquals(
      PeopleQuerySchema.parse({ malId: '10', name: 'Hayao Miyazaki' }),
      { malId: 10, name: 'Hayao Miyazaki' },
    );
  });

  it('throws BadRequestException when identifiers are missing', async () => {
    const { logger } = createMockLogger();
    const repository = {} as PeopleRepository;
    const service = new PeopleService(repository, logger);

    await assertRejects(
      () => service.aggregate({}),
      BadRequestException,
    );
  });

  it('throws NotFoundException when repository returns null', async () => {
    const { logger } = createMockLogger();
    const repository = {
      invoke: spy(async () => null),
    } as unknown as PeopleRepository;

    const service = new PeopleService(repository, logger);

    await assertRejects(
      () => service.aggregate({ malId: 10 }),
      NotFoundException,
    );
  });

  it('returns people document when resolved', async () => {
    const { logger } = createMockLogger();
    const { ObjectId } = await import('mongodb');
    const doc = { _id: new ObjectId(), ...makePeopleDocument() };

    const repository = {
      invoke: spy(async () => doc),
    } as unknown as PeopleRepository;

    const service = new PeopleService(repository, logger);
    const result = await service.aggregate({ malId: 10 });

    assertEquals(result.malId, 10);
    assertEquals(result.name, 'Hayao Miyazaki');
  });

  it('passes name-only queries to repository when MAL id is unavailable', async () => {
    const { logger } = createMockLogger();
    const { ObjectId } = await import('mongodb');
    const doc = { _id: new ObjectId(), ...makePeopleDocument() };

    const invokeSpy = spy(async () => doc);
    const repository = {
      invoke: invokeSpy,
    } as unknown as PeopleRepository;

    const service = new PeopleService(repository, logger);
    await service.aggregate({ name: 'Hayao Miyazaki' });

    assertEquals(invokeSpy.calls.length, 1);
    assertEquals(
      (invokeSpy.calls[0] as { args: unknown[] }).args,
      [undefined, 'Hayao Miyazaki'],
    );
  });

  it('passes both identifiers to repository when provided', async () => {
    const { logger } = createMockLogger();
    const { ObjectId } = await import('mongodb');
    const doc = { _id: new ObjectId(), ...makePeopleDocument() };

    const invokeSpy = spy(async () => doc);
    const repository = {
      invoke: invokeSpy,
    } as unknown as PeopleRepository;

    const service = new PeopleService(repository, logger);
    await service.aggregate({ malId: 10, name: 'Hayao Miyazaki' });

    assertEquals(invokeSpy.calls.length, 1);
    assertEquals(
      (invokeSpy.calls[0] as { args: unknown[] }).args,
      [10, 'Hayao Miyazaki'],
    );
  });
});
