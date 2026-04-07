import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@danet/core';
import { LoggerService } from '@scope/logger';
import { CharacterRepository } from './repository/index.ts';
import type { CharacterDocument, CharacterQuery } from './character.types.ts';

@Injectable()
export class CharacterService {
  constructor(
    private readonly repository: CharacterRepository,
    private readonly logger: LoggerService,
  ) {}

  async aggregate(query: CharacterQuery): Promise<CharacterDocument> {
    const nameHint = query.name?.trim() || undefined;

    if (query.malId === undefined && nameHint === undefined) {
      this.logger.instance.warn('Character query missing identifiers', {
        query,
      });
      throw new BadRequestException();
    }

    const result = await this.repository.invoke(query.malId, nameHint);

    if (!result) {
      this.logger.instance.warn('Character not found', {
        malId: query.malId,
        nameHint,
      });
      throw new NotFoundException();
    }

    const { _id, ...document } = result;
    return document as CharacterDocument;
  }
}
