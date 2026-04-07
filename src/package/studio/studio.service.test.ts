import { describe, it } from '@std/testing/bdd';
import { assertEquals, assertRejects, assertThrows } from '@std/assert';
import { spy } from '@std/testing/mock';
import { BadRequestException, NotFoundException } from '@danet/core';
import { StudioService } from './studio.service.ts';
import { StudioRepository } from './repository/index.ts';
import { createMockLogger } from '@scope/common/testing';
import { StudioQuerySchema } from './studio.schema.ts';
import type { StudioDocument } from './studio.types.ts';

const nowSeconds = () => Math.floor(Date.now() / 1000);

function makeStudioDocument(
  overrides?: Partial<StudioDocument>,
): StudioDocument {
  const now = nowSeconds();
  return {
    malId: 1,
    titles: [{ type: 'Default', title: 'Toei Animation' }],
    name: 'Toei Animation',
    about: 'A major anime studio.',
    established: 0,
    imageUrl: null,
    favorites: 1000,
    animeCount: 300,
    fetchedAt: now,
    expiresAt: now + 86400 * 30,
    ...overrides,
  };
}

describe('StudioService', () => {
  it('allows empty query objects at schema level', () => {
    assertEquals(StudioQuerySchema.parse({}), {});
  });

  it('rejects non-positive MAL identifiers in query schema', () => {
    assertThrows(
      () => StudioQuerySchema.parse({ malId: '0', name: 'Toei Animation' }),
      Error,
    );
  });

  it('parses positive integer MAL identifiers in query schema', () => {
    assertEquals(
      StudioQuerySchema.parse({ malId: '1', name: 'Toei Animation' }),
      { malId: 1, name: 'Toei Animation' },
    );
  });

  it('throws BadRequestException when identifiers are missing', async () => {
    const { logger } = createMockLogger();
    const repository = {} as StudioRepository;
    const service = new StudioService(repository, logger);

    await assertRejects(
      () => service.aggregate({}),
      BadRequestException,
    );
  });

  it('throws NotFoundException when repository returns null', async () => {
    const { logger } = createMockLogger();
    const repository = {
      invoke: spy(async () => null),
    } as unknown as StudioRepository;

    const service = new StudioService(repository, logger);

    await assertRejects(
      () => service.aggregate({ malId: 1 }),
      NotFoundException,
    );
  });

  it('returns studio document when resolved', async () => {
    const { logger } = createMockLogger();
    const { ObjectId } = await import('mongodb');
    const doc = { _id: new ObjectId(), ...makeStudioDocument() };

    const repository = {
      invoke: spy(async () => doc),
    } as unknown as StudioRepository;

    const service = new StudioService(repository, logger);
    const result = await service.aggregate({ malId: 1 });

    assertEquals(result.malId, 1);
    assertEquals(result.name, 'Toei Animation');
  });

  it('passes name-only queries to repository when MAL id is unavailable', async () => {
    const { logger } = createMockLogger();
    const { ObjectId } = await import('mongodb');
    const doc = { _id: new ObjectId(), ...makeStudioDocument() };

    const invokeSpy = spy(async () => doc);
    const repository = {
      invoke: invokeSpy,
    } as unknown as StudioRepository;

    const service = new StudioService(repository, logger);
    await service.aggregate({ name: 'Toei Animation' });

    assertEquals(invokeSpy.calls.length, 1);
    assertEquals(
      (invokeSpy.calls[0] as { args: unknown[] }).args,
      [undefined, 'Toei Animation'],
    );
  });

  it('passes both identifiers to repository when provided', async () => {
    const { logger } = createMockLogger();
    const { ObjectId } = await import('mongodb');
    const doc = { _id: new ObjectId(), ...makeStudioDocument() };

    const invokeSpy = spy(async () => doc);
    const repository = {
      invoke: invokeSpy,
    } as unknown as StudioRepository;

    const service = new StudioService(repository, logger);
    await service.aggregate({ malId: 1, name: 'Toei Animation' });

    assertEquals(invokeSpy.calls.length, 1);
    assertEquals(
      (invokeSpy.calls[0] as { args: unknown[] }).args,
      [1, 'Toei Animation'],
    );
  });
});
