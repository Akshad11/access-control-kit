# Access Control Kit Development Roadmap

This roadmap outlines our path from the initial core foundation to the comprehensive enterprise authorization suite (v1.0).

---

## 🗺️ Version Timeline and Releases

| Version | Status | Target Package / Capability | Description |
| :--- | :---: | :--- | :--- |
| **`v0.1`** | **Done** | `@access-control-kit/core` | Core RBAC, Wildcard Engine, Stateless checks, and configurations. |
| **`v0.2`** | **Done** | **Role Inheritance** | Nested role chains (e.g. `Admin` inherits `Manager` inherits `Employee`). |
| **`v0.3`** | **Done** | **User Overrides** | Assigning specific permissions directly to a user bypassing role boundaries. |
| **`v0.4`** | **Done** | **Temporary Permissions** | Time-based role assignments and TTL-governed permissions. |
| **`v0.5`** | Planned | **Multi-Tenant** | Partitioning roles, permissions, and checks by unique tenant dimensions. |
| **`v0.6`** | Planned | **Ownership** | Contextual resource-owner validation checks (e.g., `user.id === post.authorId`). |
| **`v0.7`** | Planned | **ABAC Policy Engine** | Attribute-Based Access Control enforcing dynamic, attribute-driven conditions. |
| **`v0.8`** | Planned | `@access-control-kit/express` | Plug-and-play Express integration package with built-in route middleware. |
| **`v0.9`** | Planned | `@access-control-kit/nestjs` | Official NestJS module with injectable decorators and global request guards. |
| **`v1.0`** | Planned | `@access-control-kit/react` + Prisma | Complete Client Provider hooks + official Prisma Database Adapter mappings. |

---

## 🛠️ Release Specifications

### `v0.1` — The Core Foundation (Completed)
- High-Performance RBAC permission resolution.
- Regex compiled and cached Wildcard Matcher engine.
- Stateless, database-agnostic session checking capabilities.
- dual module bundles (ESM & CJS) with type declarations.

### `v0.2` — Hierarchies & Chains (Completed)
- Support directed acyclic graph (DAG) hierarchies.
- Automated inheritance resolution to fetch all ancestor grants without loop deadlocks.

### `v0.3` — User-Specific Tweaks (Completed)
- Support precise user bypass: grant or revoke specific permissions directly for a user.
- Explicit overrides take precedence over inherited role permissions.

### `v0.4` — Temporal Authorization (Completed)
- Support transient access: assign roles or grant permissions with a specific expiration timestamp (`expiresAt`).
- Automatic cleanup of expired mappings during evaluations.

### `v0.5` — Enterprise Partitioning
- Introduce `TenantContext` to guarantee complete tenant isolation.
- Configure separate sets of roles and mappings on the same running process safely.

### `v0.6` & `v0.7` — Dynamic Policies & ABAC
- Implement attribute comparisons (e.g., matching requested resource objects against current user profiles).
- Decouple access rules using structural policy JSON schemas.

### `v0.8` & `v0.9` — Server Integrations
- Standalone NPM middleware packages allowing developers to import pre-configured boundary guards instantly.

### `v1.0` — UI & Persistent Database Adapters
- Declarative components for React client trees.
- Native database adapter schemas (Prisma, TypeORM, Mongoose) for automatic sync.
