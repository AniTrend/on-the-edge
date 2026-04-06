import { describe, it } from '@std/testing/bdd';
import { assertEquals, assertRejects } from '@std/assert';
import { spy } from '@std/testing/mock';
import { NotFoundException } from '@danet/core';
import { StudioService } from './studio.service.ts';
import { StudioRepository } from './repository/index.ts';
import { createMockLogger } from '@scope/common/testing';
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
  it('throws NotFoundException when repository returns null', async () => {
    const { logger } = createMockLogger();
    const repository = {
      invoke: spy(async () => null),
    } as unknown as StudioRepository;

    const service = new StudioService(repository, logger);

    await assertRejects(
      () => service.aggregate(1),
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
    const result = await service.aggregate(1);

    assertEquals(result.malId, 1);
    assertEquals(result.name, 'Toei Animation');
  });

  it('passes nameHint to repository when provided', async () => {
    const { logger } = createMockLogger();
    const { ObjectId } = await import('mongodb');
    const doc = { _id: new ObjectId(), ...makeStudioDocument() };

    const invokeSpy = spy(async () => doc);
    const repository = {
      invoke: invokeSpy,
    } as unknown as StudioRepository;

    const service = new StudioService(repository, logger);
    await service.aggregate(1, 'Toei Animation');

    assertEquals(invokeSpy.calls.length, 1);
    assertEquals(
      (invokeSpy.calls[0] as { args: unknown[] }).args,
      [1, 'Toei Animation'],
    );
  });
});

describe('StudioService', () => {
  it('throws NotFoundException when repository returns null', async () => {
    const { logger } = createMockLogger();
    const repository = {
      invoke: spy(async () => null),
    } as unknown as StudioRepository;

    const service = new StudioService(repository, logger);

    await assertRejects(
      () => service.aggregate(1),
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
    const result = await service.aggregate(1);

    assertEquals(result.malId, 1);
    assertEquals(result.name, 'Toei Animation');
  });

  it('passes nameHint to repository when provided', async () => {
    const { logger } = createMockLogger();
    const { ObjectId } = await import('mongodb');
    const doc = { _id: new ObjectId(), ...makeStudioDocument() };

    const invokeSpy = spy(async () => doc);
    const repository = {
      invoke: invokeSpy,
    } as unknown as StudioRepository;

    const service = new StudioService(repository, logger);
    await service.aggregate(1, 'Toei Animation');

    assertEquals(invokeSpy.calls.length, 1);
    assertEquals(
      (invokeSpy.calls[0] as { args: unknown[] }).args,
      [1, 'Toei Animation'],
    );
  });
});
