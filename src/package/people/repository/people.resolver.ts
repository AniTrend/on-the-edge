import { Injectable } from '@danet/core';
import { LoggerService } from '@scope/logger';
import { JikanPerson, JikanService } from '@scope/service/jikan';

@Injectable()
export class PeopleResolver {
  constructor(
    private readonly jikan: JikanService,
    private readonly logger: LoggerService,
  ) {}

  async resolve(
    malId: number | null | undefined,
    nameHint?: string,
  ): Promise<JikanPerson | undefined> {
    if (malId != null) {
      const person = await this.jikan.getPerson(malId);
      if (person) {
        return person;
      }
      this.logger.instance.debug(
        `Person not found by malId=${malId}, falling back to keyword search`,
      );
    }

    if (nameHint) {
      return await this.jikan.getPersonByKeyword(nameHint);
    }

    return undefined;
  }
}
