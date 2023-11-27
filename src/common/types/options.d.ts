import { Context, Middleware, Router, State } from 'x/oak';

// deno-lint-ignore no-explicit-any
type AS = Record<string, any>;

export interface FactoryOptions<S extends State = AS> {
  router?: Router;
  handler?: Middleware<S, Context<S, AS>>;
}
