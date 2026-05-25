export type SignalName = 'SIGINT' | 'SIGTERM';

type TimerHandle = ReturnType<typeof setTimeout>;

export type ShutdownDependencies = {
  signals?: SignalName[];
  close: () => Promise<void>;
  log: (message: string) => void;
  warn: (message: string) => void;
  exit: () => void;
  setTimer?: typeof setTimeout;
  clearTimer?: typeof clearTimeout;
  addSignalListener?: typeof Deno.addSignalListener;
  removeSignalListener?: typeof Deno.removeSignalListener;
  cleanupDelayMs?: number;
};

export const installShutdownHandler = ({
  signals = ['SIGINT', 'SIGTERM'],
  close,
  log,
  warn,
  exit,
  setTimer = setTimeout,
  clearTimer = clearTimeout,
  addSignalListener = Deno.addSignalListener,
  removeSignalListener = Deno.removeSignalListener,
  cleanupDelayMs = 2000,
}: ShutdownDependencies) => {
  const onDispose = (tokens: TimerHandle[]) => {
    log('Deno resource cleanup initiated');
    for (const signal of signals) {
      removeSignalListener(signal, onTerminationRequest);
    }

    setTimer(() => {
      tokens.forEach((token) => clearTimer(token));
      log('Deno resource cleanup completed, exiting process now!');
      exit();
    }, cleanupDelayMs);
  };

  const onTerminationRequest = (): void => {
    log('Deno recieved shutdown request from user or system');
    const shutDown = setTimer(async () => {
      try {
        await close();
      } catch (error: Error | unknown) {
        error instanceof Error
          ? warn(error.stack ?? error.message)
          : warn(`Unable to gracefully shutdown application: ${error}`);
      }
    });

    onDispose([shutDown]);
  };

  for (const signal of signals) {
    addSignalListener(signal, onTerminationRequest);
  }

  return onTerminationRequest;
};
