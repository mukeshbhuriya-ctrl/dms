const { WebSocketServer, WebSocket } = require('ws');
const { decryptToken } = require('#utils/jwt-encrypt');

class NotificationSocketService {
  constructor() {
    this.wss = null;
    this.clientsByUser = new Map(); // userId -> Set(ws)
    this.heartbeatInterval = null;
  }

  _parseCookies(cookieHeader = '') {
    const out = {};
    for (const part of cookieHeader.split(';')) {
      const [k, ...rest] = part.trim().split('=');
      if (!k) continue;
      out[k] = decodeURIComponent(rest.join('='));
    }
    return out;
  }

  _extractToken(req) {
    const cookies = this._parseCookies(req.headers.cookie || '');
    if (cookies.token) return cookies.token;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    const url = new URL(req.url, 'http://localhost');
    const queryToken = url.searchParams.get('token');
    return queryToken || null;
  }

  async _authenticate(req) {
    const token = this._extractToken(req);
    if (!token) {
      const error = new Error('Missing auth token');
      error.code = 401;
      throw error;
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      const error = new Error('JWT_SECRET is not configured');
      error.code = 500;
      throw error;
    }

    const decoded = await decryptToken(token, secret);
    const userId = decoded.userid || decoded.id;
    const companyId = decoded.company_id || null;

    if (!userId) {
      const error = new Error('Invalid token payload');
      error.code = 401;
      throw error;
    }

    return { userId, companyId };
  }

  _register(userId, ws) {
    if (!this.clientsByUser.has(userId)) {
      this.clientsByUser.set(userId, new Set());
    }
    this.clientsByUser.get(userId).add(ws);

    ws.on('close', () => {
      const bucket = this.clientsByUser.get(userId);
      if (!bucket) return;
      bucket.delete(ws);
      if (bucket.size === 0) this.clientsByUser.delete(userId);
    });
  }

  _send(ws, event, data) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ event, data }));
  }

  _setupHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    this.heartbeatInterval = setInterval(() => {
      if (!this.wss) return;
      this.wss.clients.forEach((ws) => {
        if (ws.isAlive === false) {
          ws.terminate();
          return;
        }

        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);
  }

  init(server) {
    if (this.wss) return this.wss;

    this.wss = new WebSocketServer({ noServer: true });
    this._setupHeartbeat();

    this.wss.on('connection', (ws, req, context = {}) => {
      const { userId } = context;
      if (!userId) {
        ws.close(1008, 'Unauthorized');
        return;
      }

      ws.isAlive = true;
      ws.on('pong', () => {
        ws.isAlive = true;
      });

      this._register(userId, ws);
      this._send(ws, 'connected', { ok: true, ts: new Date().toISOString() });
    });

    server.on('upgrade', async (req, socket, head) => {
      try {
        const url = new URL(req.url, 'http://localhost');
        if (url.pathname !== '/ws/notifications') {
          socket.destroy();
          return;
        }

        const context = await this._authenticate(req);
        this.wss.handleUpgrade(req, socket, head, (ws) => {
          this.wss.emit('connection', ws, req, context);
        });
      } catch {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
      }
    });

    return this.wss;
  }

  emitToUser(userId, eventName, payload) {
    const bucket = this.clientsByUser.get(userId);
    if (!bucket || bucket.size === 0) return;

    for (const ws of bucket) {
      this._send(ws, eventName, payload);
    }
  }
}

module.exports = new NotificationSocketService();
