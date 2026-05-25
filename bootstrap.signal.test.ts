import { assert, assertEquals } from '@std/assert';

const FIXTURE_PATH = 'tests/fixtures/signal_runtime_fixture.ts';
type ShutdownSignal = 'SIGINT' | 'SIGTERM';

const readStream = async (stream: ReadableStream<Uint8Array> | null) => {
  if (!stream) return '';
  return await new Response(stream).text();
};

const readUntil = async (
  reader: ReadableStreamDefaultReader<Uint8Array>,
  expected: string,
) => {
  const decoder = new TextDecoder();
  let output = '';

  while (!output.includes(expected)) {
    const { done, value } = await reader.read();
    if (done) break;
    output += decoder.decode(value, { stream: true });
  }

  return output;
};

const assertSignalShutdown = async (signal: ShutdownSignal) => {
  const child = new Deno.Command('/bin/sh', {
    args: ['-c', `deno run -P ${FIXTURE_PATH} --signal=${signal}`],
    stdout: 'piped',
    stderr: 'piped',
  }).spawn();

  const reader = child.stdout!.getReader();
  let stdout = await readUntil(reader, 'fixture-ready');

  child.kill(signal);

  const status = await child.status;
  const remainder = await readStream(new ReadableStream({
    async start(controller) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        controller.enqueue(value);
      }
      controller.close();
      reader.releaseLock();
    },
  }));
  stdout += remainder;
  const stderr = await readStream(child.stderr);

  assertEquals(status.success, true, stderr);
  assert(stdout.includes(`received:${signal}`));
  assert(stdout.includes('close-called'));
  assert(stdout.includes('cleanup-complete'));
};

Deno.test('process handles SIGTERM and exits cleanly', async () => {
  await assertSignalShutdown('SIGTERM');
});

Deno.test('process handles SIGINT and exits cleanly', async () => {
  await assertSignalShutdown('SIGINT');
});
