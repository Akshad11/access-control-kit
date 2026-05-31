# Changelog

All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.5.0] - 2026-05-31

### Added
- **Multi-Tenant Scoping**: Upgraded the core library to fully isolate roles, permissions, user overrides, and temporary permissions per tenant organization.
- **Tenant Context Checks**: Refactored the core resolver and coord entrypoints to accept `TenantContext` parameters inside checks and mutations, guaranteeing zero tenant leakage.
- **Tenant Context Validations**: Implemented fail-safe validations throwing `TenantContextRequiredError` and `TenantNotFoundError` when multi-tenant mode is active.
- **Triple-Nested Cache Design**: Advanced the user permission resolution cache to a triple-nested map structure (`userId -> tenantId -> permission -> cachedResult`), implementing targeted tenant-specific invalidations in $O(1)$ complexity.
- **Unified Single/Multi Mode**: Integrated single-tenant backward compatibility cleanly by defaulting to `__default__` tenant ID context when no tenants are registered.
- **Comprehensive Scoped Tests**: Wrote extensive multi-tenant integration tests achieving 100% statement and branch coverages.

## [0.4.0] - 2026-05-31

### Added
- **Temporary Permissions Subsystem**: Implemented time-bound user permissions via `TemporaryPermissionStore` supporting active and wildcard matching.
- **Precedence Hierarchy Update**: Configured `PermissionResolver` to evaluate rules in the strict new seven-level precedence order (User Deny > User Allow > Temporary > Direct Role > Inherited Role > Wildcard Role > Default Deny).
- **Time-Bound Cache Expirations**: Integrated caching with explicit TTL coordinates, storing `{ value: boolean, expiresAt?: number }` in `userPermissionCache` to automatically clean up expired cached entries.
- **Automatic & Lazy Cleanup**: Supported lazy auto-cleanup of expired temporary permission records during lookups (governed by customizable `autoCleanupExpiredPermissions` config option).
- **Manual Cleanup Mappings**: Exposed `cleanupExpiredPermissions()` API in `AccessControl` and `TemporaryPermissionStore` to clear memory and purge invalid cached users.
- **Custom Temporary Errors & Mappings**: Added `InvalidExpirationDateError`, `TemporaryPermissionNotFoundError`, and types `TemporaryPermission`, `GrantTemporaryOptions`.

## [0.3.0] - 2026-05-31

### Added
- **User Overrides Subsystem**: Implemented user-specific permission allow and deny overrides via `UserOverrideStore`.
- **Double-Nested Resolution Cache**: Implemented a highly optimized `UserPermissionCache` mapping `userId -> permission -> allowed` to achieve $O(1)$ warm path evaluation performance.
- **Priority Resolution Engine**: Refactored `PermissionResolver` to enforce the strict six-level priority hierarchy (User Deny > User Allow > Direct Role Exact > Inherited Role Exact > Wildcard Role > Default Deny).
- **Granular Cache Invalidation**: Hooked cache invalidation so that modifications to user-specific overrides/roles only purge that user's cache, whereas global role/grant modifications invalidate the entire cache.
- **Custom Errors & Types**: Added `UserOverrideNotFoundError` and typescript typings `UserOverrides`, `UserOverrideRecord`.
- **Comprehensive Integration Tests**: Reached 100% statement and branch coverage across all active source files including new edge cases.

## [0.2.0] - 2026-05-31

### Added
- **Hierarchical Role Inheritance**: Added recursive permission inheritance with a fluent builder API (`auth.role("Manager").inherits("Employee")`).
- **Memoized BFS Resolution**: Implemented optimized traversal of the role inheritance graph using an ancestor memoization cache.
- **Cycle Prevention**: Added circular dependency detection that throws `CircularRoleInheritanceError` when circular inheritances are attempted.
- **Inheritance Cache Invalidation**: Automatic cache clears upon registering new inheritance associations.

## [0.1.0] - 2026-05-31

### Added
- **Core RBAC Capabilities**: Implemented `AccessControl`, `RoleRegistry`, `PermissionRegistry`, and `UserRoleStore` to configure enterprise role mapping registries in-memory.
- **Dynamic Wildcard Parsing**: Implemented dynamic compile-once regular expression caching engine `WildcardMatcher` supporting flexible `*` and prefix `patient.*` structures.
- **Optimized Resolver**: Implemented segregated direct/wildcard lookup in `PermissionResolver` achieving $O(\text{number\_of\_user\_roles})$ search complexity.
- **Stateless Checks**: Supported optional, pre-resolved `roles` inside `User` shape to completely bypass in-memory assignment stores for secure serverless request flows.
- **Examples Suite**: Created clean integration reference guides for Express middleware, React custom hooks, NestJS request guards, and Next.js Server Actions.
- **Robust Configurations**: Standardized ESM and CommonJS exports, type checks, lint boundaries, unit tests, and GitHub Actions CI schedules.
