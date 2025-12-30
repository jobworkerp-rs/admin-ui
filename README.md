# JobWorkerp Admin UI

A modern administrative interface for managing [JobWorkerp](https://github.com/jobworkerp-rs/jobworkerp-rs), built with React, Vite, and TypeScript.

> **Note:** This is an alpha version implemented by a coding agent. APIs and behavior may change without notice.

## Overview

This dashboard allows administrators effectively manage background job processing, including:
- Monitoring system health and job metrics.
- Managing Workers and Runners.
- Enqueuing and tracking jobs.
- Viewing and analyzing job execution results.
- Performing system maintenance (cleanup, restoration).

## Tech Stack

- **Framework**: React 19, Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS, shadcn/ui
- **Communication**: gRPC-Web (via `nice-grpc-web`), Protobuf
- **State Management**: React Query (TanStack Query)
- **Charts**: Recharts

## Features

- **Dashboard**: Real-time overview of job statuses and worker health.
- **Workers**: Create, edit, and manage worker configurations.
- **Runners**: Manage runner plugins and configurations.
- **Jobs**:
    - Enqueue new jobs with dynamic forms based on Protocol Buffers schemas.
    - View job history and details.
    - Cancel running or pending jobs.
    - Status consistency checks (find stuck jobs).
- **Results**:
    - Inspect detailed job execution outputs (decoded from Protobuf).
    - Bulk deletion and retry capabilities.
- **Function Sets**: Manage reusable function definitions.
- **System**:
    - Data cleanup (job status retention).
    - Job restoration (from RDB backup to Redis queue).

## Getting Started

### Prerequisites

- Node.js (v18+)
- pnpm (v9+)
- A running instance of JobWorkerp backend with gRPC-Web proxy enabled (Envoy or internal proxy).

### Installation

```bash
pnpm install
```

### Development

Start the development server:

```bash
pnpm dev
```

The application will be available at `http://localhost:5173`.

### Build

Build for production:

```bash
pnpm build
```

The output will be in the `dist` directory.

### Testing

Run unit tests (Vitest):

```bash
pnpm test
```

Run E2E tests (Playwright):

```bash
pnpm exec playwright test
```

## Configuration

Environment variables can be set in `.env` files (e.g., `.env.local`).

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_GRPC_ENDPOINT` | Base URL for the gRPC-Web API | `http://localhost:9000` |

## License

[MIT](LICENSE)
