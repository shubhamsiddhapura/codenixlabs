import mongoose from 'mongoose';
import { config } from './index';

let connecting: Promise<typeof mongoose> | null = null;

export async function connectDatabase(): Promise<void> {
  if (!config.mongoUri) {
    throw new Error('MONGODB_URI is not defined in environment variables');
  }

  if (mongoose.connection.readyState === 1) return;

  // Guard against two concurrent callers opening two connections during boot.
  if (!connecting) {
    connecting = mongoose.connect(config.mongoUri);
  }

  await connecting;
  console.log('✅ MongoDB connected');
}

export default connectDatabase;
