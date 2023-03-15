export const env = <T>(key: string, fallback: T) =>
  (Deno.env.get(key) as T) ?? fallback;
