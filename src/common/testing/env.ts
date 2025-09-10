type Restore = () => void;

export function withEnv(
  vars: Record<string, string>,
  fn: () => Promise<void> | void,
) {
  const restores: Restore[] = [];
  for (const [k, v] of Object.entries(vars)) {
    const prev = Deno.env.get(k);
    Deno.env.set(k, v);
    restores.push(() => {
      if (prev === undefined) Deno.env.delete(k);
      else Deno.env.set(k, prev);
    });
  }
  const run = async () => {
    try {
      await fn();
    } finally {
      for (const r of restores.reverse()) r();
    }
  };
  return run();
}

export function setEnvScoped(vars: Record<string, string>) {
  const restores: Restore[] = [];
  for (const [k, v] of Object.entries(vars)) {
    const prev = Deno.env.get(k);
    Deno.env.set(k, v);
    restores.push(() => {
      if (prev === undefined) Deno.env.delete(k);
      else Deno.env.set(k, prev);
    });
  }
  return {
    restore: () => {
      for (const r of restores.reverse()) r();
    },
  };
}
