const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();

const PORT = process.env.USER_SERVICE_PORT || 3001;
const SERVICE_NAME = process.env.SERVICE_NAME || 'user-service';

// Log file setup
const LOG_DIR = '/var/log/app';
const LOG_FILE = path.join(LOG_DIR, 'app.log');

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Simple in-memory metrics
let httpRequestsTotal = 0;

// Helper to write JSON log line
function writeLog(level, message) {
  const logEntry = {
    level,
    message,
    timestamp: new Date().toISOString()
  };
  fs.appendFile(LOG_FILE, JSON.stringify(logEntry) + '\n', (err) => {
    if (err) {
      console.error('Error writing log:', err);
    }
  });
}

// Middleware to count requests and log basic info
app.use((req, res, next) => {
  httpRequestsTotal += 1;
  writeLog('info', `Incoming request ${req.method} ${req.url}`);
  next();
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: SERVICE_NAME });
});

app.get('/metrics', (req, res) => {
  res.set('Content-Type', 'text/plain');
  const lines = [
    '# HELP http_requests_total The total number of HTTP requests.',
    '# TYPE http_requests_total counter',
    `http_requests_total{service="${SERVICE_NAME}"} ${httpRequestsTotal}`
  ];
  res.send(lines.join('\n') + '\n');
});

app.get('/users', (req, res) => {
  writeLog('info', 'Fetching users');
  res.json([{ id: 1, name: 'Alice' }]);
});

app.listen(PORT, () => {
  console.log(`${SERVICE_NAME} listening on port ${PORT}`);
  writeLog('info', `${SERVICE_NAME} started on port ${PORT}`);
});
