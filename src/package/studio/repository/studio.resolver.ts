import { Injectable } from '@danet/core';
import { LoggerService } from '@scope/logger';
import { JikanProducer, JikanService } from '@scope/service/jikan';

@Injectable()
export class StudioResolver {
  constructor(
    private readonly jikan: JikanService,
    private readonly logger: LoggerService,
  ) {}

  async resolve(
    malId: number | null | undefined,
    nameHint?: string,
  ): Promise<JikanProducer | undefined> {
    if (malId != null) {
      const producer = await this.jikan.getProducer(malId);
      if (producer) {
        return producer;
      }
      this.logger.instance.debug(
        `Studio not found by malId=${malId}, falling back to keyword search`,
      );
    }

    if (nameHint) {
      return await this.jikan.getProducerByKeyword(nameHint);
    }

    return undefined;
  }
}
