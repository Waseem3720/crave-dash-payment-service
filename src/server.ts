import { config } from './config';
import { connectDB } from './config/database';
import app from './app';

async function bootstrap(): Promise<void> {
  await connectDB();
  app.listen(config.port, () => {
    console.log(`[SERVER] Payment Service running on port ${config.port} (${config.nodeEnv})`);
  });
}

bootstrap().catch((err) => {
  console.error('[SERVER] Fatal error during startup:', err);
  process.exit(1);
});
