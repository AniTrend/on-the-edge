import { CharacterContract } from './character.contract.ts';
import { CharacterQuerySchema } from './character.schema.ts';

export const CharacterSwagger = CharacterContract;

// deno-lint-ignore no-explicit-any
export const CharacterQuerySwagger = (CharacterQuerySchema as any).openapi({
  title: 'CharacterQuery',
  description: 'Query parameters for character lookup',
});
