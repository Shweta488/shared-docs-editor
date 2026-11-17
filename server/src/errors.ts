export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONTENT_TOO_LARGE'
  | 'FILE_TOO_LARGE'
  | 'UNSUPPORTED_FILE'
  | 'INTERNAL';

const statusByCode: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONTENT_TOO_LARGE: 413,
  FILE_TOO_LARGE: 413,
  UNSUPPORTED_FILE: 415,
  INTERNAL: 500,
};

export class AppError extends Error {
  readonly status: number;
  constructor(
    readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.status = statusByCode[code];
  }
}
