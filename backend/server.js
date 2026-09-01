console.log('Loading env...');
import { config } from './src/config/env.js';

console.log('Loading app...');
import app from './app.js';

process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION]', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[UNHANDLED REJECTION]', reason);
});

import { initDb } from './src/config/migrate.js';

console.log('Starting server...');
const PORT = config.port;

const server = app.listen(PORT, '0.0.0.0', async () => {
  console.log(`Server listening on 0.0.0.0:${PORT}`);
  console.log(`[Backend Foundation] Server is running on port ${PORT}`);
  console.log(`[Backend Foundation] AI Provider configured as: ${config.aiProvider}`);
  console.log(`[Backend Foundation] Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Safe automated database migration/table verification
  try {
    await initDb();
  } catch (dbErr) {
    console.error('[Database Init Notice]', dbErr.message);
  }
});

server.on('error', (err) => {
  console.error('[SERVER ERROR]', err);
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use by another process.`);
  }
});

console.log('END OF server.js');
