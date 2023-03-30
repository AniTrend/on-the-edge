import { FuzzyDate } from './date.d.ts';

export const toFuzzyDate = (date: string | Date): FuzzyDate => {
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
