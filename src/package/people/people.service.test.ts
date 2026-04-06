import { describe, it } from '@std/testing/bdd';
import { assertEquals, assertRejects } from '@std/assert';
import { spy } from '@std/testing/mock';
import { NotFoundException } from '@danet/core';
import { PeopleService } from './people.service.ts';
import { PeopleRepository } from './repository/index.ts';
import { createMockLogger } from '@scope/common/testing';
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
  it('throws NotFoundException when repository returns null', async () => {
    const { logger } = createMockLogger();
    const repository = {
      invoke: spy(async () => null),
    } as unknown as PeopleRepository;

    const service = new PeopleService(repository, logger);

    await assertRejects(
      () => service.aggregate(10),
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
    const result = await service.aggregate(10);

    assertEquals(result.malId, 10);
    assertEquals(result.name, 'Hayao Miyazaki');
  });

  it('passes nameHint to repository when provided', async () => {
    const { logger } = createMockLogger();
    const { ObjectId } = await import('mongodb');
    const doc = { _id: new ObjectId(), ...makePeopleDocument() };

    const invokeSpy = spy(async () => doc);
    const repository = {
      invoke: invokeSpy,
    } as unknown as PeopleRepository;

    const service = new PeopleService(repository, logger);
    await service.aggregate(10, 'Hayao Miyazaki');

    assertEquals(invokeSpy.calls.length, 1);
    assertEquals(
      (invokeSpy.calls[0] as { args: unknown[] }).args,
      [10, 'Hayao Miyazaki'],
    );
  });
});
