export class MissingKeyError extends Error {
  constructor(key: string) {
    super(
      `Expected environment variable '${key}' to be present but was missing`,
    );
  }
}

export const env = <T>(key: string): T => {
  if (!Deno.env.has(key)) {
    throw new MissingKeyError(key);
  }
  const value = Deno.env.get(key) as T;
  return value;
};
