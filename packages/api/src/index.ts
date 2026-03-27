import 'dotenv/config';
import { buildApp } from './app.js';

const s3Config =
  process.env.S3_ACCESS_KEY_ID &&
  process.env.S3_SECRET_ACCESS_KEY &&
  process.env.S3_BUCKET &&
  process.env.S3_REGION &&
  process.env.S3_ENDPOINT
    ? {
        accessKeyId: process.env.S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
        bucket: process.env.S3_BUCKET,
        region: process.env.S3_REGION,
        endpoint: process.env.S3_ENDPOINT,
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
