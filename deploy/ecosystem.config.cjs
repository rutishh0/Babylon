// PM2 ecosystem config for Babylon Phase 2
// Usage: pm2 start ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: 'babylon-api',
      cwd: 'D:/Babylon/app',
      script: 'packages/api/dist/index.js',
      env: {
        NODE_ENV: 'production',
        PORT: '3000',
        LOCAL_MEDIA_PATH: 'D:/Babylon/media',
        DATABASE_URL: 'file:D:/Babylon/data/babylon.db',
        ALLOWED_ORIGINS: 'http://localhost:3001',
        INGEST_STATE_DIR: 'D:/Babylon/app/ingest',
      },
      node_args: '--experimental-vm-modules',
      watch: false,
      max_restarts: 10,
      restart_delay: 5000,
    },
    {
      name: 'babylon-web',
      cwd: 'D:/Babylon/app/packages/web',
      script: 'node_modules/.bin/next',
      args: 'start -p 3001',
      env: {
        NODE_ENV: 'production',
        NEXT_PUBLIC_API_URL: 'http://localhost:3000/api',
      },
      watch: false,
      max_restarts: 10,
      restart_delay: 5000,
    },
  ],
};
