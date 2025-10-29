import { Module } from '@danet/core';
import { DateHelper } from './date.helper.ts';

@Module({
  injectables: [DateHelper],
})
export class DateHelperModule {}
