import { assertEquals } from 'std/testing/asserts';
import { transformMappings } from './mapper.ts';
import { Mapping } from './types.d.ts';

Deno.test('should map the input to the expected output', () => {
  const input = [
    {
      service: 'anidb/anime',
      serviceId: '13945',
    },
    {
      service: 'myanimelist/anime',
      serviceId: '37521',
    },
    {
      service: 'anilist/anime',
      serviceId: '101348',
    },
    {
      service: 'kitsu/anime',
      serviceId: '41084',
    },
    {
      service: 'shoboi/anime',
      serviceId: '5390',
    },
  ];

  const expectedOutput = {
    anidb: '13945',
    myanimelist: '37521',
    anilist: '101348',
    kitsu: '41084',
    shoboi: '5390',
  };
  assertEquals(expectedOutput, transformMappings(input));
});

Deno.test('should handle empty input', () => {
  const input: Mapping[] = [];
  const expectedOutput = {};
  assertEquals(expectedOutput, transformMappings(input));
});

Deno.test('should handle input with missing service key', () => {
  const input = [
    {
      service: '/anime',
      serviceId: '13945',
    },
  ];
  const expectedOutput = {};
  assertEquals(expectedOutput, transformMappings(input));
});
