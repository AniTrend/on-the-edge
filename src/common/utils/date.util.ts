export interface FuzzyDate {
  year: number;
  month: number;
  day: number;
}

export type Instant = number;

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

export const toInstant = (date: string | Date): Instant => {
  if (date instanceof Date) {
    return date.getTime() / 1000;
  } else {
    const d = new Date(date);
    return d.getTime() / 1000;
  }
};

/**
 * Represents a date in RFC 822 format (e.g., "Mon, 02 Jan 2006 15:04:05 GMT").
 *
 * @link https://www.ietf.org/rfc/rfc822.txt
 */
export type RCF822Date = string;

/**
 * Gets the current date in {@link RCF822Date} format
 *
 * @returns The current date in RFC 822 format.
 */
export const currentDate = (): RCF822Date => {
  const currentDate = new Date();
  return currentDate.toUTCString();
};

/**
 * @returns The current instant as a Temporal.Instant
 *
 * @link https://docs.deno.com/examples/temporal/
 */
export const currentInstant = (): Temporal.Instant => {
  return Temporal.Now.instant();
};
