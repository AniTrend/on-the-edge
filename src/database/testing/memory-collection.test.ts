import { afterEach, beforeEach, describe, it } from '@std/testing/bdd';
import { assert, assertEquals } from '@std/assert';
import { InMemoryCollection } from './memory-collection.ts';

interface TestDoc {
  name: string;
  value: number;
  category?: string;
}

describe('InMemoryCollection', () => {
  let collection: InMemoryCollection<TestDoc>;

  beforeEach(() => {
    collection = new InMemoryCollection<TestDoc>();
  });

  afterEach(() => {
    collection.clear();
  });

  describe('insertMany and findOne', () => {
    it('should insert and retrieve documents', async () => {
      await collection.insertMany([
        { name: 'doc1', value: 100 },
        { name: 'doc2', value: 200 },
      ]);

      const doc = await collection.findOne({ name: 'doc1' });
      assert(doc);
      assertEquals(doc.name, 'doc1');
      assertEquals(doc.value, 100);
    });

    it('should return null when document not found', async () => {
      const doc = await collection.findOne({ name: 'nonexistent' });
      assertEquals(doc, null);
    });
  });

  describe('find with sorting and limiting', () => {
    it('should support sorting by numbers ascending', async () => {
      await collection.insertMany([
        { name: 'b', value: 2 },
        { name: 'a', value: 1 },
        { name: 'c', value: 3 },
      ]);

      const docs = await collection
        .find(undefined, { sort: { value: 1 } });

      assertEquals(docs[0].value, 1);
      assertEquals(docs[1].value, 2);
      assertEquals(docs[2].value, 3);
    });

    it('should support sorting by numbers descending', async () => {
      await collection.insertMany([
        { name: 'a', value: 1 },
        { name: 'b', value: 2 },
        { name: 'c', value: 3 },
      ]);

      const docs = await collection
        .find(undefined, { sort: { value: -1 } });

      assertEquals(docs[0].value, 3);
      assertEquals(docs[1].value, 2);
      assertEquals(docs[2].value, 1);
    });

    it('should support limiting', async () => {
      await collection.insertMany([
        { name: 'a', value: 1 },
        { name: 'b', value: 2 },
        { name: 'c', value: 3 },
      ]);

      const docs = await collection.find(undefined, { limit: 2 });
      assertEquals(docs.length, 2);
    });

    it('should support sorting and limiting together', async () => {
      await collection.insertMany([
        { name: 'c', value: 3 },
        { name: 'a', value: 1 },
        { name: 'b', value: 2 },
      ]);

      const docs = await collection
        .find(undefined, { sort: { value: -1 }, limit: 2 });

      assertEquals(docs.length, 2);
      assertEquals(docs[0].value, 3);
      assertEquals(docs[1].value, 2);
    });
  });

  describe('updateOne', () => {
    it('should update existing document', async () => {
      await collection.insertOne({ name: 'test', value: 100 });

      const result = await collection.updateOne(
        { name: 'test' },
        { $set: { value: 200 } },
      );

      assertEquals(result.modifiedCount, 1);

      const updated = await collection.findOne({ name: 'test' });
      assertEquals(updated?.value, 200);
    });

    it('should support upsert when document does not exist', async () => {
      const result = await collection.updateOne(
        { name: 'new' },
        { $set: { value: 300 } },
        { upsert: true },
      );

      assertEquals(result.upsertedCount, 1);

      const doc = await collection.findOne({ name: 'new' });
      assert(doc);
      assertEquals(doc.value, 300);
    });

    it('should return matchedCount 0 when document not found without upsert', async () => {
      const result = await collection.updateOne(
        { name: 'nonexistent' },
        { $set: { value: 400 } },
      );

      assertEquals(result.matchedCount, 0);
      assertEquals(result.modifiedCount, 0);
    });
  });

  describe('findOneAndReplace', () => {
    it('should replace existing document', async () => {
      await collection.insertOne({ name: 'old', value: 100 });

      const result = await collection.findOneAndReplace(
        { name: 'old' },
        { name: 'new', value: 200 },
        {},
      );

      assert(result);
      assertEquals(result.name, 'new');
      assertEquals(result.value, 200);

      const found = await collection.findOne({ name: 'new' });
      assert(found);
    });

    it('should upsert when document does not exist', async () => {
      const result = await collection.findOneAndReplace(
        { name: 'nonexistent' },
        { name: 'created', value: 400 },
        { upsert: true },
      );

      assert(result);
      assertEquals(result.name, 'created');
    });

    it('should return null when document not found without upsert', async () => {
      const result = await collection.findOneAndReplace(
        { name: 'nonexistent' },
        { name: 'replacement', value: 500 },
        {},
      );

      assertEquals(result, null);
    });
  });

  describe('comparison operators', () => {
    it('should support $gt operator', async () => {
      await collection.insertMany([
        { name: 'a', value: 10 },
        { name: 'b', value: 20 },
        { name: 'c', value: 30 },
      ]);

      const docs = await collection.find({ value: { $gt: 15 } });
      assertEquals(docs.length, 2);
      assert(docs.every((d) => d.value > 15));
    });

    it('should support $lt operator', async () => {
      await collection.insertMany([
        { name: 'a', value: 10 },
        { name: 'b', value: 20 },
        { name: 'c', value: 30 },
      ]);

      const docs = await collection.find({ value: { $lt: 25 } });
      assertEquals(docs.length, 2);
      assert(docs.every((d) => d.value < 25));
    });

    it('should support $gte operator', async () => {
      await collection.insertMany([
        { name: 'a', value: 10 },
        { name: 'b', value: 20 },
        { name: 'c', value: 30 },
      ]);

      const docs = await collection.find({ value: { $gte: 20 } });
      assertEquals(docs.length, 2);
      assert(docs.every((d) => d.value >= 20));
    });

    it('should support $lte operator', async () => {
      await collection.insertMany([
        { name: 'a', value: 10 },
        { name: 'b', value: 20 },
        { name: 'c', value: 30 },
      ]);

      const docs = await collection.find({ value: { $lte: 20 } });
      assertEquals(docs.length, 2);
      assert(docs.every((d) => d.value <= 20));
    });

    it('should support $exists operator', async () => {
      await collection.insertMany([
        { name: 'a', value: 10, category: 'x' },
        { name: 'b', value: 20 },
      ]);

      const withCategory = await collection
        .find({ category: { $exists: true } });

      assertEquals(withCategory.length, 1);
      assertEquals(withCategory[0].name, 'a');

      const withoutCategory = await collection
        .find({ category: { $exists: false } });

      assertEquals(withoutCategory.length, 1);
      assertEquals(withoutCategory[0].name, 'b');
    });
  });

  describe('clear', () => {
    it('should remove all documents', async () => {
      await collection.insertMany([
        { name: 'a', value: 1 },
        { name: 'b', value: 2 },
      ]);

      collection.clear();

      const count = await collection.countDocuments();
      assertEquals(count, 0);
    });
  });

  describe('countDocuments', () => {
    it('should count all documents when no filter provided', async () => {
      await collection.insertMany([
        { name: 'a', value: 1 },
        { name: 'b', value: 2 },
        { name: 'c', value: 3 },
      ]);

      const count = await collection.countDocuments();
      assertEquals(count, 3);
    });

    it('should count documents matching filter', async () => {
      await collection.insertMany([
        { name: 'a', value: 10 },
        { name: 'b', value: 20 },
        { name: 'c', value: 30 },
      ]);

      const count = await collection.countDocuments({ value: { $gte: 20 } });
      assertEquals(count, 2);
    });
  });

  describe('insertOne', () => {
    it('should insert single document and return insertedId', async () => {
      const result = await collection.insertOne({ name: 'single', value: 999 });

      assert(result.insertedId);
      assertEquals(typeof result.insertedId, 'object');

      const doc = await collection.findOne({ name: 'single' });
      assert(doc);
      assertEquals(doc.value, 999);
    });
  });
});
