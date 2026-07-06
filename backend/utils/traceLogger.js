const { AsyncLocalStorage } = require('async_hooks');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const traceStorage = new AsyncLocalStorage();

const ROOT_DIR = process.env.ROOT_DIR || 'C:/dms-data';
const TRACE_LOGS_DIR = path.join(ROOT_DIR, 'logs');

if (!fs.existsSync(TRACE_LOGS_DIR)) {
    fs.mkdirSync(TRACE_LOGS_DIR, { recursive: true });
}

// Preserve original console methods
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;
const originalInfo = console.info;

function formatLog(level, args) {
    const traceId = traceStorage.getStore();
    const prefix = traceId ? `[TRC-${traceId}] ` : '';
    
    const timestamp = new Date().toISOString();
    
    // Convert all args to string
    const msg = args.map(arg => {
        if (typeof arg === 'object') {
            if (arg instanceof Error) return arg.stack || arg.message;
            try { return JSON.stringify(arg); } catch(e) { return String(arg); }
        }
        return String(arg);
    }).join(' ');

    const logLine = `${timestamp} ${level} ${prefix}${msg}\n`;
    
    // Write to daily file
    const dateStr = timestamp.split('T')[0];
    const logFile = path.join(TRACE_LOGS_DIR, `trace-${dateStr}.log`);
    
    fs.appendFile(logFile, logLine, (err) => {
        // Fallback if writing fails, prevent infinite loop
        if (err) originalError('Failed to write to trace log:', err);
    });

    return [prefix.trim() ? prefix.trim() : '', ...args].filter(Boolean);
}

// Hijack global console methods
console.log = function(...args) {
    const newArgs = formatLog('INFO', args);
    originalLog.apply(console, newArgs);
};

console.warn = function(...args) {
    const newArgs = formatLog('WARN', args);
    originalWarn.apply(console, newArgs);
};

console.error = function(...args) {
    const newArgs = formatLog('ERROR', args);
    originalError.apply(console, newArgs);
};

console.info = function(...args) {
    const newArgs = formatLog('INFO', args);
    originalInfo.apply(console, newArgs);
};

const traceMiddleware = (req, res, next) => {
    // Generate a unique short Trace ID (8 hex chars)
    const traceId = crypto.randomBytes(4).toString('hex');
    
    // Add to response header so frontend/clients can see it
    res.setHeader('x-trace-id', `TRC-${traceId}`);

    traceStorage.run(traceId, () => {
        console.log(`[REQ_START] ${req.method} ${req.originalUrl}`);
        
        // When response finishes
        res.on('finish', () => {
            console.log(`[REQ_END] ${req.method} ${req.originalUrl} - Status: ${res.statusCode}`);
        });
        
        next();
    });
};

module.exports = {
    traceMiddleware,
    traceStorage
};
