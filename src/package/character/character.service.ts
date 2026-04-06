import { Injectable, NotFoundException } from '@danet/core';
import { LoggerService } from '@scope/logger';
import { CharacterRepository } from './repository/index.ts';
import type { CharacterDocument } from './character.types.ts';

@Injectable()
export class CharacterService {
  constructor(
    private readonly repository: CharacterRepository,
    private readonly logger: LoggerService,
  ) {}

  async aggregate(
    malId: number,
    nameHint?: string,
  ): Promise<CharacterDocument> {
    const result = await this.repository.invoke(malId, nameHint);

    if (!result) {
      this.logger.instance.warn('Character not found', { malId, nameHint });
      throw new NotFoundException();
    }

    const { _id, ...document } = result;
    return document as CharacterDocument;
  }
}
