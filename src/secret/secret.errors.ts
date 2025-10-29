export class MissingKeyError extends Error {
  constructor(key: string) {
    super(
      `Expected environment variable '${key}' to be present but was missing`,
    );
  }
}

export class InvalidValueError extends Error {
  constructor(key: string, recieved: string, expected: string) {
    super(
      `Expected environment variable '${key}' to be a type of: '${expected}' but got '${recieved}'`,
    );
  }
}

export class NoVariablesFoundError extends Error {
  constructor() {
    super(
      'No environment variables found. Please ensure you have a .env file or the necessary environment variables set.',
    );
  }
}
