import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { errorResponse } from '../utils/response';

/**
 * Run after express-validator chains.
 * Returns 422 with the first validation error if any exist.
 */
export function validate(req: Request, res: Response, next: NextFunction): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const first = errors.array()[0];
    errorResponse(res, 'VALIDATION_ERROR', (first as { msg: string }).msg, 422);
    return;
  }
  next();
}
