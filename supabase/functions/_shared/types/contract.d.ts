import { Growth } from './core.d.ts';
import { Service } from './state.d.ts';

type Config = {
  service: Service;
  growth: Growth;
};

export type Remote<I, O> = (
  config: Config,
  input: I,
) => Promise<O>;
