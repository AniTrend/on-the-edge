import { PersonContract } from './people.contract.ts';
import { PeopleQuerySchema } from './people.schema.ts';

export const PeopleSwagger = PersonContract;

// deno-lint-ignore no-explicit-any
export const PeopleQuerySwagger = (PeopleQuerySchema as any).openapi({
  title: 'PeopleQuery',
  description: 'Query parameters for people lookup',
});
