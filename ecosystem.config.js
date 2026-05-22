/**
 * PM2 Ecosystem Configuration — DMS Production (Windows Server)
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
      instances: 'max',
      exec_mode: 'cluster',

      // ─── Stability & Recovery ────────────────────────────────────
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      restart_delay: 3000,
      max_restarts: 10,
      min_uptime: '10s',

      // ─── Logs ────────────────────────────────────────────────────
      out_file: path.join(__dirname, 'logs', 'dms-out.log'),
      error_file: path.join(__dirname, 'logs', 'dms-error.log'),
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // ─── Node.js Flags ───────────────────────────────────────────
      node_args: '--max-old-space-size=512',

      // ─── Environment: Development ────────────────────────────────
      env: {
        NODE_ENV: 'development',
        PORT: 3001,
      },

      // ─── Environment: Production ─────────────────────────────────
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,

        // PostgreSQL
        DATABASE_URL:
          'postgresql://YOUR_DB_USER:YOUR_DB_PASSWORD@localhost:5432/YOUR_DB_NAME',

        // CORS
        CORS_ORIGIN: 'http://YOUR_SERVER_IP',

        // JWT
        JWT_SECRET: 'CHANGE_THIS_TO_A_SECURE_RANDOM_SECRET',
        JWT_EXPIRES_IN: '7d',

        // URLs
        FRONTEND_URL: 'http://YOUR_SERVER_IP',
        BACKEND_URL: 'http://YOUR_SERVER_IP/api',

        // File storage
        ROOT_DIR: 'D:/your-storage-folder',
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