import type { ErrorRequestHandler, RequestHandler } from 'express';
import type { ApiErrorBody } from '../../../shared/types.js';
import { AppError } from '../errors.js';

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(new AppError('NOT_FOUND', 'Not found'));
};

// Every error leaves the API in the same shape. Unknown errors are logged
// and replaced with a generic message so internals never reach the client.
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  let appError: AppError;
  if (err instanceof AppError) {
    appError = err;
  } else if (err?.type === 'entity.too.large') {
    appError = new AppError('CONTENT_TOO_LARGE', 'This document is too large to save.');
  } else if (err?.type === 'entity.parse.failed') {
    appError = new AppError('VALIDATION_ERROR', 'Request body is not valid JSON.');
  } else {
    console.error(err);
    appError = new AppError('INTERNAL', 'Something went wrong. Please try again.');
  }
  const body: ApiErrorBody = { error: { code: appError.code, message: appError.message } };
  res.status(appError.status).json(body);
};
