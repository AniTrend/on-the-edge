import { Injectable } from '@danet/core';
import { LoggerService } from '@scope/logger';
import { JikanCharacter, JikanService } from '@scope/service/jikan';

@Injectable()
export class CharacterResolver {
  constructor(
    private readonly jikan: JikanService,
    private readonly logger: LoggerService,
  ) {}

  async resolve(
    malId: number | null | undefined,
    nameHint?: string,
  ): Promise<JikanCharacter | undefined> {
    if (malId != null) {
      const character = await this.jikan.getCharacter(malId);
      if (character) {
        return character;
      }
      this.logger.instance.debug(
        `Character not found by malId=${malId}, falling back to keyword search`,
      );
    }

    if (nameHint) {
      return await this.jikan.getCharacterByKeyword(nameHint);
    }

    return undefined;
  }
}
