export class SeriesNotFoundError extends Error {
  constructor(message = 'Series not found') {
    super(message);
    this.name = 'SeriesNotFoundError';
  }
}
