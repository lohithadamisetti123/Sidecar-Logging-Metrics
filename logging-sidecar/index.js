const fs = require('fs');
const axios = require('axios');

const LOG_FILE_PATH = process.env.LOG_FILE_PATH || '/var/log/app/app.log';
const SERVICE_NAME = process.env.SERVICE_NAME || 'unknown-service';
const ENVIRONMENT = process.env.ENVIRONMENT || 'development';
const LOG_AGGREGATOR_URL = process.env.LOG_AGGREGATOR_URL || 'http://log-aggregator:8080/logs';
const POLL_INTERVAL_MS = parseInt(process.env.LOG_POLL_INTERVAL_MS || '1000', 10);

let filePosition = 0;

function processNewData() {
  fs.stat(LOG_FILE_PATH, (err, stats) => {
    if (err) {
      console.error('Error stating log file:', err.message);
      return;
    }

    if (stats.size < filePosition) {
      filePosition = 0;
    }

    if (stats.size > filePosition) {
      const readStream = fs.createReadStream(LOG_FILE_PATH, {
        start: filePosition,
        end: stats.size
      });

      let buffer = '';
      readStream.on('data', (chunk) => {
        buffer += chunk.toString();
        let lines = buffer.split('\n');
        buffer = lines.pop();
        lines.forEach(handleLogLine);
      });

      readStream.on('end', () => {
        filePosition = stats.size;
      });

      readStream.on('error', (e) => {
        console.error('Error reading log file:', e.message);
      });
    }
  });
}

async function handleLogLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return;

  let obj;
  try {
    obj = JSON.parse(trimmed);
  } catch (e) {
    console.error('Failed to parse log line as JSON:', trimmed);
    return;
  }

  const enriched = {
    ...obj,
    service_name: SERVICE_NAME,
    environment: ENVIRONMENT
  };

  try {
    const res = await axios.post(LOG_AGGREGATOR_URL, enriched, {
      headers: { 'Content-Type': 'application/json' },
      validateStatus: () => true
    });
    if (res.status !== 202) {
      console.error(`Unexpected status from log aggregator: ${res.status}`);
    }
  } catch (e) {
    console.error('Error sending log to aggregator:', e.message);
  }
}

console.log('Logging sidecar started for service:', SERVICE_NAME);
setInterval(processNewData, POLL_INTERVAL_MS);
