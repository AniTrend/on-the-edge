import { RCF822Date } from '../types/core.d.ts';
import { env } from './env.ts';

export const isOlderThan = (
  date: RCF822Date,
  epoch: number,
  hour: number,
): boolean => {
  const rfc822Date = new Date(date);
  const epochDate = new Date(epoch * 1000); // Convert epoch time to milliseconds

  // Calculate the difference between the two dates in hours
  const timeDiffHours = (rfc822Date.getTime() - epochDate.getTime()) /
    (1000 * 60 * 60);

  return timeDiffHours >= hour;
};

export const currentDate = (): RCF822Date => {
  const currentDate = new Date();
  return currentDate.toUTCString();
};

export const toEpotch = (dateString: RCF822Date): number => {
  const date = new Date(dateString as string);
  const epochTime = date.getTime() / 1000;
  return epochTime;
};

export const pagination = (page: number, count: number) => {
  const limit = count ? +count : 3;
  const from = page ? (page - 1) * limit : 0;
  const to = page ? from + count - 1 : count - 1;

  return { from, to };
};

export const isNullOrUndefined = (obj: unknown) =>
  obj == null || obj == undefined;

export const port = env<number>('PORT');
