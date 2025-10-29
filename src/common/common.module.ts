import { Module } from '@danet/core';
import { DateHelperModule } from './date/date.helper.module.ts';

@Module({
  injectables: [DateHelperModule],
})
export class CommonModule {}
