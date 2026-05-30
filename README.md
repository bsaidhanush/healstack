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

## Beta Release (Public)

HealStack Beta is now published to the npm registry as `healstack@1.0.0` and is publicly installable. For a quick verification, run:

```bash
npm install healstack
```

Basic usage:

```javascript
import HealStack from "healstack";

HealStack.init({
  apiKey: "demo-key",
  autoHeal: true
});
```

See the release notes for Beta in `docs/release-notes-beta.md` for details and how to report issues.

## Quick Start

```javascript
import HealStack from "healstack";

HealStack.init({
  apiKey: "demo-key"
});
```

## SDK Usage

### Installation

```bash
npm install healstack
```

### TypeScript Support

HealStack is now built with full TypeScript support. Type definitions are included out of the box.

```typescript
import HealStack from "healstack";

HealStack.init({
  apiKey: "demo-key",
  autoHeal: true
});
```

### Core Capabilities

- **Auto-Healing**: Automatically recover from common errors
- **Error Tracking**: Monitor frontend errors and API failures
- **Smart Retry**: Exponential backoff retry strategies
- **Fallback APIs**: Switch to backup endpoints on failure
- **Real-time Diagnostics**: AI-powered error analysis

### Configuration

```typescript
HealStack.init({
  apiKey: "your-api-key",
  autoHeal: true,           // Enable automatic recovery
  debug: false,             // Enable debug logging
  environment: "production" // Set environment
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
