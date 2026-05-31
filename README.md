# Access Control Kit

> A high-performance, strongly-typed, developer-first authorization and RBAC library designed for modern TypeScript and JavaScript applications.

---

## 📦 Packages in this Monorepo

| Package | Version | Description |
| :--- | :--- | :--- |
| [`@access-control-kit/core`](/packages/core) | **`v0.1.0`** | Core RBAC validation, cached wildcard matching, and stateless authorization engine. |

---

## ✨ Features at a Glance

- ⚡ **High Performance**: Permission evaluations resolved in `O(number_of_user_roles)` complexity, avoiding full permission list scans.
- 🎯 **Wildcard Permissions**: Support for flexible patterns (e.g., `*`, `patient.*`, `user.*`) using compiled and cached regular expression matcher.
- 🛡️ **Fail-Safe Validation**: Enforces strict format checks and handles duplicate/missing assets gracefully with custom errors.
- 🎨 **Strict TypeScript Support**: Written in pure TypeScript with absolute type safety and zero dependencies.
- 📦 **Dual Output Bundles**: Distributed with tree-shakeable ESM, CommonJS, and complete TypeScript `.d.ts` definitions.

---

## 🗺️ Monorepo Structure

```text
rolelib/
├── packages/
│   └── core/                 # Core authorization library
│       ├── src/              # Source code
│       ├── tests/            # Full Vitest suite (100% covered)
│       ├── examples/         # Express, NestJS, Next.js & React integrations
│       └── package.json
├── ROADMAP.md                # Development version release specifications
├── LICENSE                   # MIT license file
├── CONTRIBUTING.md           # Contribution guidelines
├── CODE_OF_CONDUCT.md        # Contributor code of conduct standards
├── SECURITY.md               # Security reporting protocols
└── CHANGELOG.md              # Version release history logs
```

---

## 🚀 Quick Start with Core

```typescript
import { AccessControl } from '@access-control-kit/core';

const auth = new AccessControl();

// 1. Register Roles & Permissions
auth.role('Manager');
auth.permission('patient.*');

// 2. Grant permissions to roles
auth.grant('Manager', 'patient.*');

// 3. Fast stateless checking using session roles
const user = { id: 'u1', roles: ['Manager'] };
const allowed = auth.can(user, 'patient.view'); // true
```

---

## 🗺️ Roadmap and Version Milestones

| Version | Status | Target Package / Capability |
| :--- | :---: | :--- |
| **`v0.1`** | **Done** | `@access-control-kit/core` base release |
| **`v0.2`** | Planned | Role Inheritance support |
| **`v0.3`** | Planned | User Overrides capabilities |
| **`v0.4`** | Planned | Temporary/Time-based Permissions |
| **`v0.5`** | Planned | Multi-Tenant context isolation |
| **`v0.6`** | Planned | Ownership validation rules |
| **`v0.7`** | Planned | ABAC condition-based Policy Engine |
| **`v0.8`** | Planned | `@access-control-kit/express` package |
| **`v0.9`** | Planned | `@access-control-kit/nestjs` package |
| **`v1.0`** | Planned | `@access-control-kit/react` + Prisma adapters |

For complete release specifications, see the detailed [ROADMAP.md](ROADMAP.md).

---

## 📄 License

MIT © Access Control Kit Authors. See the [LICENSE](LICENSE) file for details.
