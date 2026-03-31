// PM2 ecosystem config for Babylon Phase 2
// Usage: pm2 start ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: 'babylon-api',
      cwd: 'B:/Babylon/app',
      script: 'packages/api/dist/index.js',
      env: {
        NODE_ENV: 'production',
        PORT: '3000',
        LOCAL_MEDIA_PATH: 'B:/Babylon/media',
        DATABASE_URL: 'file:B:/Babylon/data/babylon.db',
        ALLOWED_ORIGINS: 'http://localhost:3001,http://192.168.1.140:3001',
        INGEST_STATE_DIR: 'B:/Babylon/app/ingest',
      },
      node_args: '--experimental-vm-modules',
      windowsHide: true,
      watch: false,
      max_restarts: 10,
      restart_delay: 5000,
    },
    {
      name: 'babylon-web',
      cwd: 'B:/Babylon/app/packages/web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3001',
      env: {
        NODE_ENV: 'production',
        NEXT_PUBLIC_API_URL: 'http://localhost:3000/api',
      },
      windowsHide: true,
      watch: false,
      max_restarts: 10,
      restart_delay: 5000,
    },
    {
      name: 'babylon-anime',
      cwd: 'B:/Babylon/app/phase1.5',
      script: 'venv/Scripts/pythonw.exe',
      args: 'server.py',
      env: {
        FLASK_ENV: 'production',
      },
      windowsHide: true,
      watch: false,
      max_restarts: 10,
      restart_delay: 5000,
    },
  ],
};
