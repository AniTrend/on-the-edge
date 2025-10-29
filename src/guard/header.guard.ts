import { AuthGuard, ExecutionContext, Injectable, Logger } from '@danet/core';

@Injectable()
export class HeaderGuard implements AuthGuard {
  private readonly logger: Logger = new Logger(HeaderGuard.name);

  private readonly MUTATION_HTTP_METHODS: string[] = [
    'PATCH',
    'POST',
    'PUT',
  ];

  private readonly MUTATION_HEADERS: string[] = [
    'content-type',
  ];

  canActivate(context: ExecutionContext): Promise<boolean> | boolean {
    const request = context.req.raw;
    if (this.MUTATION_HTTP_METHODS.includes(request.method)) {
      for (const header of this.MUTATION_HEADERS) {
        if (!request.headers.has(header)) {
          this.logger.error(
            `Required header is missing from request: ${header}`,
          );
          return false;
        }
      }
    }
    return true;
  }
}
