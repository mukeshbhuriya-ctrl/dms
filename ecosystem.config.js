/**
 * PM2 Ecosystem Configuration — DMS Production (Windows Server)
 *
 * Usage:
 *   pm2 start ecosystem.config.js --env production
 *   pm2 reload ecosystem.config.js --env production   (zero-downtime reload)
 *   pm2 stop dms-backend
 *   pm2 delete dms-backend
 *   pm2 logs dms-backend
 *   pm2 monit
 */

const path = require('path');

module.exports = {
  apps: [
    {
      // ─── Identity ────────────────────────────────────────────────
      name: 'dms-backend',
      script: path.join(__dirname, 'backend', 'server.js'),
      cwd: path.join(__dirname, 'backend'),

      // ─── Cluster Mode ────────────────────────────────────────────
      // 'max' = one worker per logical CPU core.
      // On Windows Server, this gives you full multi-core utilisation.
      // Lower to a fixed number (e.g. 2) if you want to reserve cores.
      instances: 'max',
      exec_mode: 'cluster',

      // ─── Stability & Recovery ────────────────────────────────────
      autorestart: true,
      watch: false,            // NEVER watch in production
      max_memory_restart: '512M',
      restart_delay: 3000,     // wait 3s before restarting after crash
      max_restarts: 10,        // give up after 10 rapid restarts
      min_uptime: '10s',       // a restart within 10s counts as a crash

      // ─── Logs ────────────────────────────────────────────────────
      // Logs are written to the logs/ folder at the project root.
      // Run `pm2 install pm2-logrotate` to enable automatic rotation.
      out_file: path.join(__dirname, 'logs', 'dms-out.log'),
      error_file: path.join(__dirname, 'logs', 'dms-error.log'),
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,        // merge cluster-instance logs into one file

      // ─── Node.js Flags ───────────────────────────────────────────
      node_args: '--max-old-space-size=512',

      // ─── Environment: Development ────────────────────────────────
      env: {
        NODE_ENV: 'development',
        PORT: 3001,
      },

      // ─── Environment: Production ─────────────────────────────────
      // Loaded when you pass `--env production` to pm2 start/reload.
      // These values override what is in .env.production as a safety net.
      // The server.js itself also loads .env via dotenv/config.
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,

        // PostgreSQL — local Windows Server install
        DATABASE_URL: 'postgresql://postgres:toor@localhost:5432/dms',

        // CORS — allow the Nginx-served frontend (IP based)
        CORS_ORIGIN: 'http://10.56.2.195',

        // JWT
        JWT_SECRET: '8fK9zQ2LmXpR7vYw3N6tB1cDeF5hJkLA',
        JWT_EXPIRES_IN: '7d',

        // URLs (Nginx proxies /api → :3001; frontend is on port 80)
        FRONTEND_URL: 'http://10.56.2.195',
        BACKEND_URL: 'http://10.56.2.195/api',

        // File storage root — Windows path
        ROOT_DIR: 'D:/dms-data',
        MAX_FILE_SIZE: 1073741824,

        // Email
        SMTP_HOST: 'smtp.gmail.com',
        SMTP_PORT: 587,
        SMTP_USER: 'your_email@example.com',
        SMTP_PASS: 'your_smtp_app_password',
        EMAIL_ENABLED: 'true',
      },
    },
  ],
};
