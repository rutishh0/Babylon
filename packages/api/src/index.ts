import 'dotenv/config';
import { buildApp } from './app.js';

const app = await buildApp({
  dbPath: process.env.DATABASE_URL?.replace('file:', '') || './babylon.db',
  pin: process.env.BABYLON_PIN,
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(','),
});

const port = parseInt(process.env.PORT || '3000', 10);

try {
  await app.listen({ port, host: '0.0.0.0' });
  console.log(`Babylon API running on http://localhost:${port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
