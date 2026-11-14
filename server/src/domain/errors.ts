/** What went wrong, independent of transport. The HTTP layer maps it to a status (see http/errors.ts). */
export type DomainErrorKind = 'not_found' | 'invalid' | 'upstream';

/** Expected failure with a stable machine-readable code, rendered as {error:{code,message}}. */
export class DomainError extends Error {
  constructor(
    readonly kind: DomainErrorKind,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}
