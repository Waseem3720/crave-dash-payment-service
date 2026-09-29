import express, { Application, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { errorResponse } from './utils/response';

// Module routers
import paymentGatewayRoutes from './modules/payment-gateways/routes';
import offlinePaymentRoutes from './modules/offline-payments/routes';
import paymentsRoutes from './modules/payments/routes';
import posTerminalRoutes from './modules/pos-terminals/routes';
import posSessionRoutes from './modules/pos-sessions/routes';
import cashDrawerRoutes from './modules/cash-drawer/routes';
import posOperationRoutes from './modules/pos-operations/routes';
import walletRoutes from './modules/wallet/routes';
import loyaltyRoutes from './modules/loyalty/routes';
import referralRoutes from './modules/referrals/routes';
import deliverymanWalletRoutes from './modules/deliveryman-wallet/routes';
import settingsRoutes from './modules/settings/routes';

const app: Application = express();

// ─── Security & logging ──────────────────────────────────────────────────────
app.use(helmet());
// Storefront browsers call wallet/loyalty/referrals/card-payment endpoints
// directly with Authorization + x-restaurant-id headers.
app.use(
  cors({
    origin: process.env.CORS_ORIGIN && process.env.CORS_ORIGIN !== '*' ? process.env.CORS_ORIGIN.split(',') : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-restaurant-id'],
  })
);
app.use(morgan('dev'));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Health check ────────────────────────────────────────────────────────────
app.get('/health', (_req: Request, res: Response) => {
  res.json({ success: true, service: 'payment-service', status: 'ok' });
});

// ─── API Routes ──────────────────────────────────────────────────────────────
const api = '/api/v1';

app.use(api, paymentGatewayRoutes);
app.use(api, offlinePaymentRoutes);
app.use(api, paymentsRoutes);
app.use(api, posTerminalRoutes);
app.use(api, posSessionRoutes);
app.use(api, cashDrawerRoutes);
app.use(api, posOperationRoutes);
app.use(api, walletRoutes);
app.use(api, loyaltyRoutes);
app.use(api, referralRoutes);
app.use(api, deliverymanWalletRoutes);
app.use(api, settingsRoutes);

// ─── 404 ─────────────────────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  errorResponse(res, 'NOT_FOUND', 'Route not found', 404);
});

// ─── Global error handler ────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[ERROR]', err);
  errorResponse(res, 'INTERNAL_SERVER_ERROR', err.message || 'Unexpected error', 500);
});

export default app;
