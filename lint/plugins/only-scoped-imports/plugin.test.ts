import { assert, assertEquals } from '@std/assert';
import { analyzeRelativeImport } from './rule.ts';

Deno.test('allows relative imports within the same package', () => {
  const result = analyzeRelativeImport(
    'src/service/trakt/trakt.service.ts',
    '../remote/episodes.remote.ts',
  );
  assert(!result.shouldReport);
  assertEquals(result.sourcePackage, 'service');
  assertEquals(result.targetPackage, 'service');
});

Deno.test('flags relative imports that cross package boundaries', () => {
  const result = analyzeRelativeImport(
    'src/service/trakt/trakt.service.ts',
    '../../common/core/logger.ts',
  );
  assert(result.shouldReport);
  assertEquals(result.sourcePackage, 'service');
  assertEquals(result.targetPackage, 'common');
});

Deno.test('allows relative imports at the src root', () => {
  const result = analyzeRelativeImport(
    'src/mod.ts',
    './routes.ts',
  );
  assert(!result.shouldReport);
  assertEquals(result.sourcePackage, '');
  assertEquals(result.targetPackage, '');
});

Deno.test('ignores files outside of src', () => {
  const result = analyzeRelativeImport(
    'docs/examples/example.ts',
    '../src/mod.ts',
  );
  assert(!result.shouldReport);
  assertEquals(result.sourcePackage, null);
});

Deno.test('handles absolute file urls', () => {
  const result = analyzeRelativeImport(
    'file:///workspace/on-the-edge/src/episodes/controller.ts',
    './transformer/episode.transformer.ts',
  );
  assert(!result.shouldReport);
  assertEquals(result.sourcePackage, 'episodes');
  assertEquals(result.targetPackage, 'episodes');
});
