/**
 * Domain errors for the Push module.
 */

export class PushInstallationNotFoundError extends Error {
  constructor(installationId: string) {
    super(`Push installation not found: ${installationId}`);
    this.name = 'PushInstallationNotFoundError';
  }
}

export class PushChallengeExpiredError extends Error {
  constructor(installationId: string) {
    super(`Push challenge expired for installation: ${installationId}`);
    this.name = 'PushChallengeExpiredError';
  }
}

export class PushChallengeInvalidError extends Error {
  constructor(installationId: string) {
    super(
      `Invalid challenge token for installation: ${installationId}`,
    );
    this.name = 'PushChallengeInvalidError';
  }
}

export class PushEndpointGoneError extends Error {
  constructor(endpoint: string) {
    super(`Push endpoint returned 410 Gone: ${endpoint}`);
    this.name = 'PushEndpointGoneError';
  }
}

export class PushSsrfValidationError extends Error {
  constructor(endpoint: string, reason: string) {
    super(`SSRF validation failed for "${endpoint}": ${reason}`);
    this.name = 'PushSsrfValidationError';
  }
}
