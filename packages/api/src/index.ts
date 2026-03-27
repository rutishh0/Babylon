import 'dotenv/config';
import { buildApp } from './app.js';

const s3Config =
  process.env.SCALEWAY_ACCESS_KEY &&
  process.env.SCALEWAY_SECRET_KEY
    ? {
        accessKeyId: process.env.SCALEWAY_ACCESS_KEY,
        secretAccessKey: process.env.SCALEWAY_SECRET_KEY,
        bucket: process.env.SCALEWAY_BUCKET || 'Babylon',
        region: process.env.SCALEWAY_REGION || 'it-mil',
        endpoint: process.env.SCALEWAY_ENDPOINT || 'https://s3.it-mil.scw.cloud',
      }
    : undefined;

const app = await buildApp({
  dbPath: process.env.DATABASE_URL?.replace('file:', '') || './babylon.db',
  pin: process.env.BABYLON_PIN,
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(','),
  s3Config,
  tmdbReadAccessToken: process.env.TMDB_READ_ACCESS_TOKEN,
});

const port = parseInt(process.env.PORT || '3000', 10);

try {
  await app.listen({ port, host: '0.0.0.0' });
  console.log(`Babylon API running on http://localhost:${port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
