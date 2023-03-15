import { v5 } from "std/uuid";
import { RCF822Date } from "../_types/core.d.ts";

export const generateUUID = (namespace: string, data: string) =>
  v5.generate(
    namespace,
    new TextEncoder().encode(data),
  );

export const toEpotch = (dateString: RCF822Date): number => {
  const date = new Date(dateString as string);
  const epochTime = date.getTime() / 1000;
  return epochTime;
};

export const pagination = (page: number, count: number) => {
  const limit = count ? +count : 3;
  const from = page ? page * limit : 0;
  const to = page ? from + count - 1 : count - 1;

  return { from, to };
};

export const port = 9000;
