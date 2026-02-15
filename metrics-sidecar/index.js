const express = require('express');
const axios = require('axios');

const app = express();

const TARGET_METRICS_URL = process.env.TARGET_METRICS_URL || 'http://localhost:3000/metrics';
const SERVICE_NAME = process.env.SERVICE_NAME || 'unknown-service';
const ENVIRONMENT = process.env.ENVIRONMENT || 'development';
const SCRAPE_INTERVAL_SECONDS = parseInt(process.env.METRICS_SCRAPE_INTERVAL_SECONDS || '15', 10);
const PORT = process.env.METRICS_SIDECAR_PORT || 9101;

let lastScrapedMetrics = '';

async function scrape() {
  try {
    const res = await axios.get(TARGET_METRICS_URL, {
      validateStatus: () => true
    });

    if (res.status !== 200) {
      console.error(`Unexpected status scraping metrics: ${res.status}`);
      return;
    }

    const original = res.data.toString();
    const enriched = enrichMetrics(original);
    lastScrapedMetrics = enriched;
  } catch (e) {
    console.error('Error scraping metrics:', e.message);
  }
}

function enrichMetrics(text) {
  const lines = text.split('\n');
  const enrichedLines = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      return line;
    }

    const spaceIndex = trimmed.lastIndexOf(' ');
    if (spaceIndex === -1) return line;

    const metricAndLabels = trimmed.substring(0, spaceIndex);
    const value = trimmed.substring(spaceIndex + 1);

    let namePart = metricAndLabels;
    let labelsPart = '';

    const labelsStart = metricAndLabels.indexOf('{');
    if (labelsStart !== -1) {
      const labelsEnd = metricAndLabels.indexOf('}', labelsStart);
      if (labelsEnd !== -1) {
        namePart = metricAndLabels.substring(0, labelsStart);
        labelsPart = metricAndLabels.substring(labelsStart + 1, labelsEnd);
      }
    }

    const extraLabels = [
      `service_name="${SERVICE_NAME}"`,
      `environment="${ENVIRONMENT}"`
    ];

    let newLabelsPart = '';
    if (labelsPart && labelsPart.length > 0) {
      newLabelsPart = labelsPart + ',' + extraLabels.join(',');
    } else {
      newLabelsPart = extraLabels.join(',');
    }

    const fullMetric = `${namePart}{${newLabelsPart}} ${value}`;

    const linePrefix = line.substring(0, line.indexOf(trimmed));
    return linePrefix + fullMetric;
  });

  return enrichedLines.join('\n');
}
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'metrics-sidecar', target: TARGET_METRICS_URL });
});

app.get('/metrics', (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send((lastScrapedMetrics || '') + '\n');
});

setInterval(scrape, SCRAPE_INTERVAL_SECONDS * 1000);
scrape();
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'metrics-sidecar', target: TARGET_METRICS_URL });
});

app.listen(PORT, () => {
  console.log(`Metrics sidecar listening on port ${PORT}, target: ${TARGET_METRICS_URL}`);
});
