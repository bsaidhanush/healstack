# HealStack Beta Release Notes

Version: 1.0.0 (Beta)
Date: 2026-05-27

Highlights
- Public npm package published as `healstack@1.0.0`.
- Core SDK (Node + Browser) with TypeScript types included.
- Primary features: runtime monitoring, auto-heal, retry strategies, and fallback endpoints.

Installation

```bash
npm install healstack
```

Quick Start

```javascript
import HealStack from "healstack";

HealStack.init({
  apiKey: "your-api-key",
  autoHeal: true
});
```

Known Issues
- 2FA/publish requirements prevented initial publish attempts; resolved by using web-based auth during `npm publish`.
- This Beta is functionally complete but may lack advanced production features (RBAC, enterprise telemetry).

Reporting Issues
- File issues on the repository or email the maintainers with reproduction steps and logs.

Next Steps
- Add CI publish automation and release tagging
- Add changelog generation and GitHub Releases
- Improve SDK telemetry and production hardening

Thank you for trying HealStack Beta!