import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const isProduction = (process.env.NODE_ENV === 'production');
const envJwtSecret = (process.env.JWT_SECRET || '').trim();
const envDatabaseUrl = (process.env.DATABASE_URL || '').trim();

if (isProduction) {
  if (!envJwtSecret || envJwtSecret === 'super_secret_jwt_key_replace_me_in_production' || envJwtSecret.length < 16) {
    throw new Error('FATAL: JWT_SECRET is required in production.');
  }
  if (!envDatabaseUrl) {
    throw new Error('FATAL: DATABASE_URL is required in production.');
  }
}

export const config = {
  port: process.env.PORT || 3000,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  databaseUrl: envDatabaseUrl,
  jwtSecret: envJwtSecret || 'insightlens_dev_insecure_key_never_use_in_prod',
  aiProvider: process.env.AI_PROVIDER || 'gemini',
  aiProviders: (process.env.AI_PROVIDERS || 'gemini,openrouter').split(',').map(s => s.trim().toLowerCase()),
  apiKeys: {
    gemini: process.env.GEMINI_API_KEY,
    openrouter: process.env.OPENROUTER_API_KEY
  },
  uploadPath: process.env.UPLOAD_PATH || 'src/uploads/',
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 26214400, // 25MB
  maxImagePixels: parseInt(process.env.MAX_IMAGE_PIXELS, 10) || 40000000,
  maxConcurrentAnalysesPerUser: parseInt(process.env.MAX_CONCURRENT_ANALYSES_PER_USER, 10) || 2,
};
