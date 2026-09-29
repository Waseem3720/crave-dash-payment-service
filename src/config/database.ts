import mongoose from 'mongoose';
import { config } from './index';

export async function connectDB(): Promise<void> {
  try {
    await mongoose.connect(config.mongoUri);
    console.log('[DB] MongoDB connected:', config.mongoUri);
  } catch (err) {
    console.error('[DB] Connection error:', err);
    process.exit(1);
  }
}
