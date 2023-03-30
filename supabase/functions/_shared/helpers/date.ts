import { FuzzyDate } from './date.d.ts';

export const toFuzzyDate = (date: Date): FuzzyDate => ({
  year: date.getFullYear(),
  month: date.getMonth(),
  day: date.getDate(),
});
