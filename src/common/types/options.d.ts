import { Context, Middleware, Router, State } from 'x/oak';

type AS = Record<string, unknown>;

export interface FactoryOptions<S extends State = AS> {
  router?: Router;
  handler?: Middleware<S, Context<S, AS>>;
}
