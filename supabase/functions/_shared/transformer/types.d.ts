export type Transform<S, T> = (sourceData: S) => T;
export type Transforms<S, T> = (sourceData: S[]) => T[];
