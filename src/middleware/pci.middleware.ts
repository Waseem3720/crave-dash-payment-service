import { Request, Response, NextFunction } from 'express';
import { containsRawCardData } from '../utils/pci';
import { errorResponse } from '../utils/response';

/**
 * PCI DSS middleware — reject any request body that contains what looks like
 * a raw card number (13-19 consecutive digits).
 * Must be mounted before any route that accepts payment body data.
 */
export function pciGuard(req: Request, res: Response, next: NextFunction): void {
  if (req.body && containsRawCardData(req.body)) {
    errorResponse(
      res,
      'PCI_VIOLATION',
      'Raw card data (PAN/CVV) is not accepted. Submit a PSP-issued payment token instead.',
      400,
    );
    return;
  }
  next();
}
