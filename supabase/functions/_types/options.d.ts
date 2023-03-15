import { Context, Middleware, Router, State } from "x/oak";
import { LimiterOptions } from "./state.ts";

// deno-lint-ignore no-explicit-any
type AS = Record<string, any>;

export interface FactoryOptions<S extends State = AS> {
  router?: Router;
  handler?: Middleware<S, Context<S, AS>>;
  rateLimit?: LimiterOptions;
}
