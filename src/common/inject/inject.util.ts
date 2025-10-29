type AnyFunction = (...args: unknown[]) => unknown;

const functionTokens = new WeakMap<AnyFunction, string>();
const objectTokens = new WeakMap<object, string>();
const primitiveTokens = new Map<string, string>();
const symbolTokens = new Map<symbol, string>();

let tokenSeed = 0;

const buildToken = (description?: string): string =>
  description
    ? `inject:${description}:${tokenSeed++}`
    : `inject-token:${tokenSeed++}`;

const getPrimitiveToken = (key: string): string => {
  const existing = primitiveTokens.get(key);
  if (existing) return existing;
  const token = buildToken(key);
  primitiveTokens.set(key, token);
  return token;
};

const getSymbolToken = (value: symbol): string => {
  const existing = symbolTokens.get(value);
  if (existing) return existing;
  const token = buildToken(value.description);
  symbolTokens.set(value, token);
  return token;
};

// deno-lint-ignore no-explicit-any
export const tokenOf = (cls: any): string => {
  if (typeof cls === 'string') {
    return cls;
  }

  if (typeof cls === 'symbol') {
    return getSymbolToken(cls);
  }

  if (cls === null) {
    return getPrimitiveToken('null');
  }

  if (typeof cls === 'undefined') {
    return getPrimitiveToken('undefined');
  }

  if (
    typeof cls === 'number' || typeof cls === 'bigint' ||
    typeof cls === 'boolean'
  ) {
    return getPrimitiveToken(`${typeof cls}:${cls.toString()}`);
  }

  if (typeof cls === 'function') {
    const existing = functionTokens.get(cls);
    if (existing) return existing;
    const token = buildToken(cls.name);
    functionTokens.set(cls, token);
    return token;
  }

  if (typeof cls === 'object') {
    const existing = objectTokens.get(cls as object);
    if (existing) return existing;
    const description = (cls as { constructor?: { name?: string } }).constructor
      ?.name;
    const token = buildToken(description);
    objectTokens.set(cls as object, token);
    return token;
  }

  return buildToken();
};
