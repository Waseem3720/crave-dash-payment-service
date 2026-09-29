import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4004', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/payment_service',
  jwtSecret: process.env.JWT_SECRET || 'changeme',
  /** Shared secret for service-to-service calls (e.g. Order → loyalty earn) */
  internalServiceApiKey: process.env.INTERNAL_SERVICE_API_KEY || process.env.INTERNAL_API_KEY || '',
  services: {
    // Order Service runs on :4004 — never default to another service's port.
    order: process.env.ORDER_SERVICE_URL || 'http://localhost:4004',
    platform: process.env.PLATFORM_SERVICE_URL || 'http://localhost:4002',
    auth: process.env.AUTH_SERVICE_URL || 'http://localhost:4001',
  },
};
