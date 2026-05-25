import { installShutdownHandler } from '../../src/common/shutdown.ts';

const signalArg = Deno.args.find((arg) => arg.startsWith('--signal='));
const selectedSignal = signalArg?.split('=')[1] === 'SIGINT'
  ? 'SIGINT'
  : 'SIGTERM';

const onTerminationRequest = installShutdownHandler({
  close: async () => {
    console.log('close-called');
  },
  log: (message) => {
    if (message.includes('shutdown request')) {
      console.log(`received:${selectedSignal}`);
    }

    if (message.includes('cleanup completed')) {
      console.log('cleanup-complete');
    }
  },
  warn: (message) => console.warn(message),
  exit: () => Deno.exit(0),
  cleanupDelayMs: 1,
  signals: [selectedSignal],
});

console.log('fixture-ready');
setInterval(() => {}, 1000);

if (Deno.args.includes('--trigger')) {
  onTerminationRequest();
}
