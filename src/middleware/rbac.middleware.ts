import { Request, Response, NextFunction } from 'express';
import { errorResponse } from '../utils/response';
import { JwtPayload } from './auth.middleware';

/**
 * Require a specific (moduleKey, action) permission from the RBAC payload.
 * The Auth Service encodes permissions as { [moduleKey]: string[] }.
 */
export function requirePermission(moduleKey: string, action: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const auth = req.auth as JwtPayload | undefined;
    if (!auth) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }
    // SAAS_SUPER_ADMIN bypasses all permission checks
    if (auth.role === 'SAAS_SUPER_ADMIN') return next();

    const allowed = auth.permissions?.[moduleKey] ?? [];
    if (!allowed.includes(action)) {
      errorResponse(res, 'FORBIDDEN', `Missing permission: ${moduleKey}.${action}`, 403);
      return;
    }
    next();
  };
}

/**
 * Require one of a specific set of roles.
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const auth = req.auth as JwtPayload | undefined;
    if (!auth || !roles.includes(auth.role)) {
      errorResponse(res, 'FORBIDDEN', `Required role: ${roles.join(' | ')}`, 403);
      return;
    }
    next();
  };
}
