import { Response } from 'express';

export interface ApiMeta {
  page?: number;
  limit?: number;
  total?: number;
  [key: string]: unknown;
}

export function successResponse(
  res: Response,
  data: unknown,
  statusCode = 200,
  meta?: ApiMeta,
): Response {
  return res.status(statusCode).json({
    success: true,
    data,
    ...(meta ? { meta } : {}),
  });
}

export function errorResponse(
  res: Response,
  code: string,
  message: string,
  statusCode = 400,
): Response {
  return res.status(statusCode).json({
    success: false,
    error: { code, message },
  });
}
