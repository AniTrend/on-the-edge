export class SeriesNotFoundError extends Error {
  constructor() {
    super('Series not found');
    this.name = 'SeriesNotFoundError';
  }
}

export class SeriesArmLookupError extends Error {
  constructor(cause: unknown) {
    super('Failed to resolve series relation from ARM');
    this.name = 'SeriesArmLookupError';
    this.cause = cause;
  }
}
