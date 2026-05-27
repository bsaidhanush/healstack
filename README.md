# HealStack

AI-powered self-healing SDK for modern applications.

Detect failures, recover automatically, and keep applications running with intelligent runtime monitoring and autonomous recovery workflows.

## Features

- Frontend error monitoring
- API failure tracking
- Automatic retry recovery
- Fallback API switching
- AI-powered diagnostics
- Real-time monitoring dashboard
- Node.js + browser support
- Plugin-based SDK architecture

## Architecture

SDK → Backend → AI Engine → Recovery Engine → Dashboard

See `docs/architecture.md` for the full system design.

## Installation

```bash
npm install healstack
```

## Quick Start

```javascript
import HealStack from "healstack";

HealStack.init({
  apiKey: "demo-key"
});
```

## Folder Structure

- `sdk/` — installable HealStack plugin package
- `backend/` — AI and monitoring backend server
- `dashboard/` — monitoring and recovery dashboard UI
- `docs/` — architecture and project documentation
- `examples/` — demo applications and local SDK tests

## Roadmap

- AI-driven recovery workflows
- Predictive healing and anomaly detection
- Kubernetes and infrastructure self-healing
- OpenAI-powered root cause analysis
- Typed SDK package for TypeScript support

## Why HealStack

HealStack is designed as a developer-first runtime protection platform. It does more than alert — it attempts to recover automatically, bringing AI-powered resilience into production applications.
