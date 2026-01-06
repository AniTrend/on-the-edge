export type Mocked<TService, TSpies, TState = unknown> = {
  service: TService;
  spies: TSpies;
  state?: TState;
  reset?: () => void;
};
