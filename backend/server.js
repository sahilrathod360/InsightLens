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

console.log('Starting server...');
const PORT = config.port;

const server = app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  console.log(`[Backend Foundation] Server is running on port ${PORT}`);
  console.log(`[Backend Foundation] AI Provider configured as: ${config.aiProvider}`);
  console.log(`[Backend Foundation] Environment: ${process.env.NODE_ENV || 'development'}`);
});

server.on('error', (err) => {
  console.error('[SERVER ERROR]', err);
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use by another process.`);
  }
});

console.log('END OF server.js');
