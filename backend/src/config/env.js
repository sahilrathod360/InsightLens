import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

export const config = {
  port: process.env.PORT || 3000,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || 'super_secret_jwt_key_replace_me_in_production',
  aiProvider: process.env.AI_PROVIDER || 'gemini',
  aiProviders: (process.env.AI_PROVIDERS || 'gemini,openrouter').split(',').map(s => s.trim().toLowerCase()),
  apiKeys: {
    gemini: process.env.GEMINI_API_KEY,
    openrouter: process.env.OPENROUTER_API_KEY
  },
  uploadPath: process.env.UPLOAD_PATH || 'src/uploads/',
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 26214400, // 25MB
};
