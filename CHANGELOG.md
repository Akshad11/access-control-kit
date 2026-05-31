# Changelog

All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.0] - 2026-05-31

### Added
- **Core RBAC Capabilities**: Implemented `AccessControl`, `RoleRegistry`, `PermissionRegistry`, and `UserRoleStore` to configure enterprise role mapping registries in-memory.
- **Dynamic Wildcard Parsing**: Implemented dynamic compile-once regular expression caching engine `WildcardMatcher` supporting flexible `*` and prefix `patient.*` structures.
- **Optimized Resolver**: Implemented segregated direct/wildcard lookup in `PermissionResolver` achieving $O(\text{number\_of\_user\_roles})$ search complexity.
- **Stateless Checks**: Supported optional, pre-resolved `roles` inside `User` shape to completely bypass in-memory assignment stores for secure serverless request flows.
- **Examples Suite**: Created clean integration reference guides for Express middleware, React custom hooks, NestJS request guards, and Next.js Server Actions.
- **Robust Configurations**: Standardized ESM and CommonJS exports, type checks, lint boundaries, unit tests, and GitHub Actions CI schedules.
