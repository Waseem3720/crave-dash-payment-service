import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { errorResponse } from '../utils/response';

export interface JwtPayload {
  sub: string;
  role: string;
  userType: string;
  restaurantId?: string;
  branchIds?: string[];
  permissions?: Record<string, string[]>;
  posPermissions?: Record<string, boolean>;
  jti?: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: JwtPayload;
    }
  }
}

/**
 * Middleware: verify JWT and attach `req.auth`.
 * Pass `required = false` to make auth optional (public routes).
 */
export function authenticate(required = true) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Service-to-service calls (e.g. Order Service → loyalty earn trigger) use a
    // shared internal API key instead of a user bearer token.
    const apiKey = req.headers['x-internal-api-key'] as string | undefined;
    if (apiKey && config.internalServiceApiKey && apiKey === config.internalServiceApiKey) {
      req.auth = {
        sub: 'service',
        role: 'SERVICE',
        userType: 'service',
        restaurantId: (req.query.restaurantId as string) || (req.body?.restaurantId as string) || undefined,
        branchIds: [],
      };
      next();
      return;
    }
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      if (!required) return next();
      errorResponse(res, 'UNAUTHORIZED', 'Missing or invalid Authorization header', 401);
      return;
    }
    const token = authHeader.slice(7);
    try {
      const payload = jwt.verify(token, config.jwtSecret) as JwtPayload;
      req.auth = payload;
      next();
    } catch {
      if (!required) return next();
      errorResponse(res, 'UNAUTHORIZED', 'Invalid or expired token', 401);
    }
  };
}
