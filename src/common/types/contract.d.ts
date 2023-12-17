import { Features } from './core.d.ts';
import { Service } from './state.d.ts';

type Config = {
  service: Service;
  growth: Features;
};

export type Remote<I, O> = (
  config: Config,
  input: I,
) => Promise<O>;
