import type { ErrorRequestHandler, RequestHandler } from 'express';
import multer from 'multer';
import { ZodError } from 'zod';
import type { ApiErrorBody } from '../../../shared/types.js';
import { AppError } from '../errors.js';

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(new AppError('NOT_FOUND', 'Not found'));
};

function fromZod(err: ZodError): AppError {
  const issue = err.issues[0];
  // Size limits are checked in the schema but answered with 413, not 400.
  if (issue?.code === 'custom' && issue.params?.code === 'CONTENT_TOO_LARGE') {
    return new AppError('CONTENT_TOO_LARGE', issue.message);
  }
  const field = issue?.path.join('.');
  const message = issue ? (field ? `${field}: ${issue.message}` : issue.message) : 'Invalid request';
  return new AppError('VALIDATION_ERROR', message);
}

// Every error leaves the API in the same shape. Unknown errors are logged
// and replaced with a generic message so internals never reach the client.
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  let appError: AppError;
  if (err instanceof AppError) {
    appError = err;
  } else if (err instanceof ZodError) {
    appError = fromZod(err);
  } else if (err instanceof multer.MulterError) {
    appError =
      err.code === 'LIMIT_FILE_SIZE'
        ? new AppError('FILE_TOO_LARGE', 'That file is over 4 MB.')
        : new AppError('VALIDATION_ERROR', 'Upload one file in the "file" field.');
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
