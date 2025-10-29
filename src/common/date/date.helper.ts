import { Injectable } from '@danet/core';
import { Instant } from '@scope/common/utils';

/** @deprecated TODO: Replace this with `Temporal` API */
@Injectable()
export class DateHelper {
  /**
   * Compares two date values against a unit/value threshold to determine ordering.
   *
   * @param reference Holds the reference (`from`) and future (`to`) date instances or ISO strings.
   *              For best performance, pass Date objects directly to avoid repeated string parsing.
   * @param comparator Specifies the comparison unit and threshold value in that unit.
   *
   * @returns 'past', 'future', or 'present' depending on how the dates relate to the threshold.
   */
  compare(
    reference: {
      from: Date | Instant | string;
      to: Date | Instant | string;
    },
    comparator: {
      unit: 'day' | 'hour' | 'minute' | 'second';
      value: number;
    },
  ): 'present' | 'future' | 'past' {
    const fromDate =
      typeof reference.from === 'string' || typeof reference.from === 'number'
        ? new Date(reference.from)
        : reference.from;
    const toDate =
      typeof reference.to === 'string' || typeof reference.to === 'number'
        ? new Date(reference.to)
        : reference.to;

    // Calculate the difference in milliseconds
    const diffInMs = toDate.getTime() - fromDate.getTime();

    // Convert the difference to the specified unit
    let diffInUnit: number;
    switch (comparator.unit) {
      case 'day':
        diffInUnit = diffInMs / (1000 * 60 * 60 * 24);
        break;
      case 'hour':
        diffInUnit = diffInMs / (1000 * 60 * 60);
        break;
      case 'minute':
        diffInUnit = diffInMs / (1000 * 60);
        break;
      case 'second':
        diffInUnit = diffInMs / 1000;
        break;
      default:
        throw new Error(`Invalid time unit supplied: ${comparator.unit}`, {
          cause: comparator.unit,
        });
    }
    return diffInUnit > comparator.value
      ? 'future'
      : diffInUnit < comparator.value
      ? 'past'
      : 'present';
  }
}
