import { app } from './app.js';
import { connectDb } from './config/db.js';
import { env } from './config/env.js';
import { ensureDemoData } from './services/bootstrap.js';

let server: ReturnType<typeof app.listen> | undefined;

function shutdown(signal: string) {
  console.log(`${signal} received. Shutting down API server...`);
  if (!server) {
    process.exit(0);
  }
  server?.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
  shutdown('unhandledRejection');
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

connectDb()
  .then(() => ensureDemoData())
  .then(() => {
    server = app.listen(env.port, () => {
      console.log(`API running on http://localhost:${env.port}`);
    });
  })
  .catch((error) => {
    console.error('Failed to start server:', error instanceof Error ? error.message : error);
    process.exit(1);
  });
