import { assertEquals, assertThrows } from '@std/assert';
import { beforeEach, describe, it } from '@std/testing/bdd';
import { DateHelper } from './date.helper.ts';

describe('DateHelper', () => {
  let dateUtil: DateHelper;

  beforeEach(() => {
    dateUtil = new DateHelper();
  });

  describe('compareDates', () => {
    describe('with Date objects', () => {
      it('should return "future" when difference exceeds threshold in days', () => {
        const now = new Date('2024-01-01T00:00:00Z');
        const next = new Date('2024-01-06T00:00:00Z');
        const result = dateUtil.compare(
          { from: now, to: next },
          { unit: 'day', value: 3 },
        );
        assertEquals(result, 'future');
      });

      it('should return "past" when difference is less than threshold in hours', () => {
        const now = new Date('2024-01-01T00:00:00Z');
        const next = new Date('2024-01-01T02:00:00Z');
        const result = dateUtil.compare(
          { from: now, to: next },
          { unit: 'hour', value: 5 },
        );
        assertEquals(result, 'past');
      });

      it('should return "present" when difference matches threshold in minutes', () => {
        const now = new Date('2024-01-01T00:00:00Z');
        const next = new Date('2024-01-01T00:30:00Z');
        const result = dateUtil.compare(
          { from: now, to: next },
          { unit: 'minute', value: 30 },
        );
        assertEquals(result, 'present');
      });

      it('should handle seconds unit', () => {
        const now = new Date('2024-01-01T00:00:00Z');
        const next = new Date('2024-01-01T00:00:45Z');
        const result = dateUtil.compare(
          { from: now, to: next },
          { unit: 'second', value: 30 },
        );
        assertEquals(result, 'future');
      });
    });

    describe('with string dates', () => {
      it('should handle ISO string inputs', () => {
        const result = dateUtil.compare(
          { from: '2024-01-01T00:00:00Z', to: '2024-01-02T00:00:00Z' },
          { unit: 'day', value: 1 },
        );
        assertEquals(result, 'present');
      });

      it('should parse and compare string dates correctly', () => {
        const result = dateUtil.compare(
          { from: '2024-01-01T00:00:00Z', to: '2024-01-01T12:00:00Z' },
          { unit: 'hour', value: 10 },
        );
        assertEquals(result, 'future');
      });
    });

    describe('edge cases', () => {
      it('should handle negative time differences', () => {
        const now = new Date('2024-01-02T00:00:00Z');
        const next = new Date('2024-01-01T00:00:00Z');
        const result = dateUtil.compare(
          { from: now, to: next },
          { unit: 'day', value: 0 },
        );
        assertEquals(result, 'past');
      });

      it('should throw error for invalid time unit', () => {
        const now = new Date('2024-01-01T00:00:00Z');
        const next = new Date('2024-01-02T00:00:00Z');
        assertThrows(
          () =>
            dateUtil.compare(
              { from: now, to: next },
              // deno-lint-ignore no-explicit-any
              { unit: 'week' as any, value: 1 },
            ),
          Error,
          'Invalid time unit supplied',
        );
      });

      it('should handle fractional time differences', () => {
        const now = new Date('2024-01-01T00:00:00Z');
        const next = new Date('2024-01-01T00:00:30Z');
        const result = dateUtil.compare(
          { from: now, to: next },
          { unit: 'minute', value: 0.5 },
        );
        assertEquals(result, 'present');
      });
    });
  });
});
