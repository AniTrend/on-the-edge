import { FuzzyDate, Instant } from './date.d.ts';

export const toFuzzyDate = (date?: string | Date): FuzzyDate => {
  if (!date) {
    return {
      year: 0,
      month: 0,
      day: 0,
    };
  }

  if (date instanceof Date) {
    return {
      year: date.getFullYear(),
      month: date.getMonth(),
      day: date.getDate(),
    };
  } else {
    const d = new Date(date);
    return {
      year: d.getFullYear(),
      month: d.getMonth(),
      day: d.getDate(),
    };
  }
};

export const toInstant = (date?: string | Date): Instant => {
  if (!date) {
    return -1;
  }

  if (date instanceof Date) {
    return date.getTime() / 1000;
  } else {
    const d = new Date(date);
    return d.getTime() / 1000;
  }
};
