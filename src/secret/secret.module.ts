import { Module } from '@danet/core';
import { SecretService } from './secret.service.ts';

@Module({
  injectables: [
    SecretService,
  ],
})
export class SecretModule {}
