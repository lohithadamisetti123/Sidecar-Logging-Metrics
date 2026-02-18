Here’s a complete `README.md` you can drop into your repo, including **Video Walkthrough** and **Screenshots** sections. Adjust links/filenames when you upload your assets to GitHub. [freecodecamp](https://www.freecodecamp.org/news/how-to-structure-your-readme-file/)

```md
# Sidecar Logging and Metrics

This project implements centralized logging and metrics collection using the **sidecar pattern** with Docker Compose. Each application service has a logging sidecar and a metrics sidecar, plus a shared mock log aggregator.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Project Structure](#project-structure)
- [Core Features](#core-features)
- [Getting Started](#getting-started)
- [Running the Stack](#running-the-stack)
- [Endpoints](#endpoints)
- [How It Works](#how-it-works)
- [Verification Guide](#verification-guide)
- [Video Walkthrough](#video-walkthrough)
- [Screenshots](#screenshots)
- [Implementation Details](#implementation-details)
- [Environment Variables](#environment-variables)
- [Development Notes](#development-notes)
- [Sidecar Pattern Resources](#sidecar-pattern-resources)

---

## Architecture Overview

The system consists of:

- Three application services:
  - `user-service`
  - `product-service`
  - `order-service`
- For each application service:
  - A **logging sidecar** that tails the app log file and forwards enriched logs to a central aggregator.
  - A **metrics sidecar** that scrapes the app metrics endpoint, enriches metrics, and re-exposes them.
- A **log-aggregator** service that receives logs from sidecars, stores the last 10, and exposes them via an API.[web:12]

All services are orchestrated using `docker-compose.yml`. A single `docker-compose up` command starts the complete system.

---

## Project Structure

```text
.
├─ docker-compose.yml
├─ .env.example
├─ README.md
├─ user-service/
│  ├─ Dockerfile
│  ├─ package.json
│  └─ index.js
├─ product-service/
│  ├─ Dockerfile
│  ├─ package.json
│  └─ index.js
├─ order-service/
│  ├─ Dockerfile
│  ├─ package.json
│  └─ index.js
├─ logging-sidecar/
│  ├─ Dockerfile
│  ├─ package.json
│  └─ index.js
├─ metrics-sidecar/
│  ├─ Dockerfile
│  ├─ package.json
│  └─ index.js
└─ log-aggregator/
   ├─ Dockerfile
   ├─ package.json
   └─ index.js
```

---

## Core Features

- **Sidecar logging**:
  - Each service writes JSON logs to `/var/log/app/app.log` in its own container.
  - Logging sidecars mount the same volume read-only and **tail** the log file.
  - Logs are enriched with `service_name` and `environment` and forwarded to `log-aggregator`.

- **Sidecar metrics**:
  - Each service exposes `/metrics` in Prometheus text format (`http_requests_total` counter).[web:6][web:36]
  - Metrics sidecars periodically scrape these endpoints.
  - Sidecars add labels `service_name` and `environment` to every metric and expose their own `/metrics`.

- **Mock log aggregator**:
  - Accepts `POST /logs` with enriched log entries.
  - Stores only the **last 10 logs** in memory.
  - Exposes `GET /logs` to inspect logs and `GET /health` for health checks.

- **Fully containerized**:
  - Single `docker-compose.yml` orchestrates all services with health checks and named volumes.

---

## Getting Started

### Prerequisites

- Docker and Docker Compose installed.[web:31]
- Git installed.
- (Optional) Node.js LTS if you want to run services locally without Docker.

### Clone the repository

```bash
git clone https://github.com/lohithadamisetti123/Sidecar-Logging-Metrics.git
cd Sidecar-Logging-Metrics
```

### Environment setup

Copy the example environment file:

```bash
cp .env.example .env
```

You can tweak ports or environment names in `.env` if needed, but the defaults work out of the box.

---

## Running the Stack

Build and start all services:

```bash
docker-compose up -d --build
```

Check container status:

```bash
docker-compose ps
```

All containers should be `Up` and services with health checks should show `(healthy)` in their status.[web:31][web:38]

Stop and clean up:

```bash
docker-compose down
```

---

## Endpoints

### Application services

- **User service**
  - Health: `GET http://localhost:3001/health`
  - Metrics: `GET http://localhost:3001/metrics`
  - API: `GET http://localhost:3001/users`

- **Product service**
  - Health: `GET http://localhost:3002/health`
  - Metrics: `GET http://localhost:3002/metrics`
  - API: `GET http://localhost:3002/products`

- **Order service**
  - Health: `GET http://localhost:3003/health`
  - Metrics: `GET http://localhost:3003/metrics`
  - API: `GET http://localhost:3003/orders`

Each `/metrics` endpoint returns Prometheus-compatible text with a custom metric:

```text
# HELP http_requests_total The total number of HTTP requests.
# TYPE http_requests_total counter
http_requests_total{service="user-service"} 42
```

### Metrics sidecars (enriched metrics)

- User metrics sidecar: `GET http://localhost:9101/metrics`
- Product metrics sidecar: `GET http://localhost:9102/metrics`
- Order metrics sidecar: `GET http://localhost:9103/metrics`

Example enriched metric line:

```text
http_requests_total{service="user-service",service_name="user-service",environment="development"} 42
```

### Log aggregator

- Health: `GET http://localhost:8080/health`
- Submit log (sidecars use this): `POST http://localhost:8080/logs`
- View last 10 logs: `GET http://localhost:8080/logs`

Example `GET /logs` response:

```json
[
  {
    "level": "info",
    "message": "Incoming request GET /users",
    "timestamp": "2026-02-18T12:26:04.033Z",
    "service_name": "user-service",
    "environment": "development"
  }
]
```

---

## How It Works

### Logging path

1. Each application writes logs to `/var/log/app/app.log` in JSON lines format:

   ```json
   {"level":"info","message":"Incoming request GET /health","timestamp":"2026-02-15T09:29:18.041Z"}
   ```

2. Each logging sidecar mounts the same volume at `/var/log/app` (read-only) and periodically reads new lines from `app.log`.[web:37][web:40]
3. The sidecar parses each JSON object, adds metadata fields:

   - `service_name` (e.g., `"user-service"`)
   - `environment` (e.g., `"development"`)

4. It then sends the enriched log to the log aggregator via `POST /logs`.

### Metrics path

1. Each application exposes `/metrics` with a counter metric `http_requests_total` following the Prometheus exposition format.[web:6][web:36]
2. The metrics sidecar for that service periodically scrapes the app’s `/metrics` endpoint.
3. It rewrites each metric line to inject two labels:
   - `service_name`
   - `environment`
4. The sidecar exposes its own `/metrics` endpoint, which a central Prometheus server could scrape in a real deployment.

---

## Verification Guide

Use these commands as a quick end-to-end verification.

### 1. Health of all services

```bash
docker-compose ps
```

- `user-service`, `product-service`, `order-service`: `Up ... (healthy)`
- `user-metrics-sidecar`, `product-metrics-sidecar`, `order-metrics-sidecar`: `Up ... (healthy)`
- `log-aggregator`: `Up ... (healthy)`

### 2. Application health and metrics

```bash
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3003/health

curl http://localhost:3001/metrics
curl http://localhost:3002/metrics
curl http://localhost:3003/metrics
```

Each `/metrics` should return `200` with at least one `http_requests_total` metric.

### 3. Enriched metrics from sidecars

```bash
curl http://localhost:9101/metrics
curl http://localhost:9102/metrics
curl http://localhost:9103/metrics
```

Check that each metric line includes `service_name` and `environment` labels.

### 4. Logging pipeline

```bash
# Generate logs
curl http://localhost:3001/users
curl http://localhost:3002/products
curl http://localhost:3003/orders

# Check aggregator after 1–2 seconds
curl http://localhost:8080/logs
```

You should see the last 10 enriched logs, including those from the endpoints you just hit.

### 5. Log files in containers

```bash
docker-compose exec user-service sh -c "ls -l /var/log/app && head /var/log/app/app.log"
docker-compose exec product-service sh -c "ls -l /var/log/app && head /var/log/app/app.log"
docker-compose exec order-service sh -c "ls -l /var/log/app && head /var/log/app/app.log"
```

Each `app.log` should contain one JSON object per line (`level`, `message`, `timestamp`).

---

## Video Walkthrough

A short video demonstrates the system end-to-end:
- Video link: `https://your-video-link-here`


## Screenshots

You can include screenshots to quickly communicate the behavior without running commands.[web:41][web:45][web:48]

Suggested screenshots (place them under a `docs/` folder, e.g., `docs/`):

1. **Docker Compose status**

   - File: `docs/docker-compose-ps.png`
   - Description: All services and sidecars `Up (healthy)` after running `docker-compose ps`.

2. **Application metrics**

   - File: `docs/user-service-metrics.png`
   - Description: Browser/curl output of `http://localhost:3001/metrics` showing `http_requests_total` metric.

3. **Sidecar enriched metrics**

   - File: `docs/user-metrics-sidecar.png`
   - Description: Output of `http://localhost:9101/metrics` showing enriched labels `service_name` and `environment`.

4. **Log aggregator**

   - File: `docs/log-aggregator-logs.png`
   - Description: Output of `http://localhost:8080/logs` showing enriched logs from all three services.

To reference them in the README, once added to the repo:

```md




```

---

## Implementation Details

- **Language:** Node.js (Express-based HTTP servers)
- **Logging format:** One JSON object per line:

  ```json
  {
    "level": "info",
    "message": "Incoming request GET /health",
    "timestamp": "2026-02-15T09:29:18.041Z"
  }
  ```

- **Metrics format:** Prometheus text exposition format (`Content-Type: text/plain`) for both app and sidecar metrics.[web:6][web:36]
- **Volumes:** Named Docker volumes per service (`user_service_logs`, `product_service_logs`, `order_service_logs`) mounted at `/var/log/app`.
- **Health checks:** Each service has a Docker healthcheck configured in `docker-compose.yml`.

The application code remains **agnostic** of external observability systems: it only writes logs to a local file and exposes `/metrics`. All forwarding, enrichment, and aggregation logic lives in the sidecars and log-aggregator.

---

## Environment Variables

See `.env.example` for full list. Key variables:

```env
# Service ports
USER_SERVICE_PORT=3001
PRODUCT_SERVICE_PORT=3002
ORDER_SERVICE_PORT=3003

# Metrics sidecar ports
USER_METRICS_SIDECAR_PORT=9101
PRODUCT_METRICS_SIDECAR_PORT=9102
ORDER_METRICS_SIDECAR_PORT=9103

# Log aggregator
LOG_AGGREGATOR_PORT=8080
LOG_AGGREGATOR_URL=http://log-aggregator:8080/logs

# Environment label
ENVIRONMENT=development

# Logging sidecar
LOG_FILE_PATH=/var/log/app/app.log
LOG_POLL_INTERVAL_MS=1000

# Metrics sidecar
METRICS_SCRAPE_INTERVAL_SECONDS=15
```




