import { Module } from '@danet/core';
import { LoggerModule } from '@scope/logger';
import { ServiceModule } from '@scope/service';
import { DatabaseModule } from '@scope/database';
import { CharacterController } from './character.controller.ts';
import { CharacterService } from './character.service.ts';
import { CharacterRepository, CharacterResolver } from './repository/index.ts';

@Module({
  imports: [LoggerModule, ServiceModule, DatabaseModule],
  controllers: [CharacterController],
  injectables: [CharacterService, CharacterRepository, CharacterResolver],
})
export class CharacterModule {}
