const express = require('express');

const app = express();
app.use(express.json());

const PORT = process.env.LOG_AGGREGATOR_PORT || 8080;

const lastLogs = [];

app.post('/logs', (req, res) => {
  const log = req.body;
  if (!log || !log.level || !log.message || !log.timestamp || !log.service_name || !log.environment) {
    return res.status(400).json({ error: 'Invalid log schema' });
  }

  lastLogs.push(log);
  if (lastLogs.length > 10) {
    lastLogs.shift();
  }

  console.log('Received log:', log);
  res.sendStatus(202);
});

app.get('/logs', (req, res) => {
  res.json(lastLogs);
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'log-aggregator' });
});

app.listen(PORT, () => {
  console.log(`log-aggregator listening on port ${PORT}`);
});
