import { assertEquals } from 'std/testing/asserts';
import { describe, it } from 'std/testing/bdd';
import { isOlderThan, pagination } from './utils.ts';

describe('utilities test', () => {
  it('isOlderThan should return true if the difference between the dates is greater than the specified hours', () => {
    const rfc822 = 'Fri, 18 Mar 2023 05:20:00 GMT';
    const epoch = 1647643200; // March 18, 2022, 5:20:00 AM UTC
    const hour = 24; // 24 hours

    const isOld = isOlderThan(rfc822, epoch, hour);
    assertEquals(isOld, true);
  });

  it('isOlderThan should return false if the difference between the dates is less than the specified hours', () => {
    const rfc822 = 'Fri, 18 Mar 2022 05:20:00 GMT'; // earlier date
    const epoch = 1647643200; // March 18, 2022, 5:20:00 AM UTC
    const hour = 48; // 48 hours

    const isOld = isOlderThan(rfc822, epoch, hour);
    assertEquals(isOld, false);
  });

  it('isOlderThan should handle invalid RCF822 dates and return false', () => {
    const rfc822 = 'invalid-date';
    const epoch = 1647643200; // March 18, 2022, 5:20:00 AM UTC
    const hour = 24; // 24 hours

    const isOld = isOlderThan(rfc822, epoch, hour);
    assertEquals(isOld, false);
  });

  it('pagination returns correct object when page and count are provided', () => {
    const page = 2;
    const count = 10;

    const result = pagination(page, count);

    assertEquals(result.from, 10);
    assertEquals(result.to, 19);
  });

  it('pagination returns correct object when only count is provided', () => {
    const count = 5;

    const result = pagination(0, count);

    assertEquals(result.from, 0);
    assertEquals(result.to, 4);
  });
});
