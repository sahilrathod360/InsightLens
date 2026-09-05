import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const explicitPort = process.env.PORT;
const explicitNodeEnv = process.env.NODE_ENV;
const explicitJwtSecret = process.env.JWT_SECRET;
const explicitDatabaseUrl = process.env.DATABASE_URL;

dotenv.config({ path: path.join(__dirname, '../../.env') });

const isProduction = ((explicitNodeEnv || process.env.NODE_ENV) === 'production');
const envJwtSecret = (explicitJwtSecret !== undefined ? explicitJwtSecret : (process.env.JWT_SECRET || '')).trim();
const envDatabaseUrl = (explicitDatabaseUrl !== undefined ? explicitDatabaseUrl : (process.env.DATABASE_URL || '')).trim();
const resolvedPort = explicitPort || process.env.PORT || 3000;

const INSECURE_PLACEHOLDERS = new Set([
  'super_secret_jwt_key_replace_me_in_production',
  'insightlens_dev_insecure_key_never_use_in_prod',
  'secret',
  'changeme',
  'jwt_secret',
  'your_jwt_secret_key_here'
]);

let jwtSecret = null;
let isJwtConfigured = false;

if (isProduction) {
  if (!envJwtSecret || INSECURE_PLACEHOLDERS.has(envJwtSecret.toLowerCase()) || envJwtSecret.length < 16) {
    console.error('[CRITICAL AUTH WARNING] JWT_SECRET is missing, insecure placeholder, or < 16 characters in production. Token signing and authentication endpoints will be disabled.');
    jwtSecret = null;
    isJwtConfigured = false;
  } else {
    jwtSecret = envJwtSecret;
    isJwtConfigured = true;
  }
} else {
  // Development mode: permit local testing fallback if explicit key is not provided
  jwtSecret = envJwtSecret || 'insightlens_dev_insecure_key_never_use_in_prod';
  isJwtConfigured = true;
}

export const config = {
  port: resolvedPort,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  databaseUrl: envDatabaseUrl,
  jwtSecret: jwtSecret,
  isJwtConfigured: isJwtConfigured,
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
