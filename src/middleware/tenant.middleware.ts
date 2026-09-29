import { Request, Response, NextFunction } from 'express';
import { errorResponse } from '../utils/response';

/**
 * Inject `restaurantId` from JWT into `req.query.__restaurantId`
 * so all downstream queries automatically scope to the tenant.
 * SAAS_SUPER_ADMIN may pass explicit restaurantId via query/body.
 */
export function tenantScope(req: Request, res: Response, next: NextFunction): void {
  const auth = req.auth;
  if (!auth) {
    errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
    return;
  }

  if (auth.role === 'SAAS_SUPER_ADMIN') {
    // Super admin may target any restaurant
    (req as Request & { tenantId?: string }).tenantId =
      (req.query.restaurantId as string) ||
      (req.body?.restaurantId as string) ||
      auth.restaurantId;
  } else {
    if (!auth.restaurantId) {
      errorResponse(res, 'BAD_REQUEST', 'restaurantId missing from token', 400);
      return;
    }
    (req as Request & { tenantId?: string }).tenantId = auth.restaurantId;
  }
  next();
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      tenantId?: string;
    }
  }
}
