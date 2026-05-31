# Access Control Kit (`@access-control-kit/core`)

An enterprise-ready, high-performance, strongly-typed Role-Based Access Control (RBAC) and Wildcard Permission authorization library for TypeScript and JavaScript.

---

## Features

- ⚡ **High Performance**: Permission evaluations resolved in `O(number_of_user_roles)` complexity, avoiding full permission list scans.
- 🎯 **Wildcard Permissions**: Support for flexible patterns (e.g., `*`, `patient.*`, `user.*`) using compiled and cached regular expression matcher.
- 🛡️ **Fail-Safe Validation**: Enforces strict format checks and handles duplicate/missing assets gracefully with custom errors.
- 📦 **Modern Output Bundles**: Distributed with tree-shakeable ESM, CommonJS, and complete TypeScript `.d.ts` definitions.
- 🎨 **Strict TypeScript Support**: Written in pure TypeScript with absolute type safety and zero dependencies.

---

## Installation

```bash
# Using pnpm
pnpm add @access-control-kit/core

# Using npm
npm install @access-control-kit/core

# Using yarn
yarn add @access-control-kit/core
```

---

## Quick Start

### 1. Initialize and Define Registry

Define your roles and permissions upfront. The system guarantees uniqueness and validates formats:

```typescript
import { AccessControl } from '@access-control-kit/core';

const auth = new AccessControl();

// 1. Register Roles
auth.role('Admin');
auth.role('Manager');
auth.role('Employee');

// 2. Register Permissions
auth.permission('user.create');
auth.permission('user.delete');
auth.permission('patient.view');
auth.permission('patient.edit');
auth.permission('invoice.delete');
auth.permission('patient.*'); // Wildcard permission
auth.permission('*');          // Global wildcard
```

### 2. Map Permissions and Assign Roles

Map permissions to your roles and assign those roles to users dynamically:

```typescript
// 3. Grant permissions to roles
auth.grant('Admin', '*');                  // Admin gets everything
auth.grant('Manager', 'patient.*');        // Manager gets any patient operations
auth.grant('Employee', 'patient.view');    // Employee gets only view access

// 4. Assign roles to users
auth.assignRole('user_admin_1', 'Admin');
auth.assignRole('user_manager_1', 'Manager');
auth.assignRole('user_employee_1', 'Employee');
```

### 3. Enforce Access Checks

Verify permissions quickly with `auth.can()`:

```typescript
const employee = { id: 'user_employee_1' };
const manager = { id: 'user_manager_1' };

// Check Employee access
auth.can(employee, 'patient.view');   // true
auth.can(employee, 'patient.edit');   // false

// Check Manager access (resolved via wildcard)
auth.can(manager, 'patient.view');    // true
auth.can(manager, 'patient.edit');    // true
auth.can(manager, 'user.create');     // false
```

---

## Role Inheritance

The library supports hierarchical roles with recursive permission inheritance using a fluent builder API:

```typescript
// Define base roles
auth.role("Employee");

// Manager inherits all permissions granted to Employee
auth.role("Manager")
  .inherits("Employee");

// Admin inherits all Manager permissions (and recursively, Employee permissions)
auth.role("Admin")
  .inherits("Manager");
```

### Inheritance Mechanics

1. **Recursive Resolution**: Permission checks traverse the inheritance graph recursively using a memoized BFS search to retrieve all ancestors, resolving evaluations in `O(number_of_user_roles)` for warm paths.
2. **Cycle Prevention**: Circular dependencies (e.g. `A inherits B inherits A`) are strictly blocked. Adding an inheritance edge that forms a loop throws `CircularRoleInheritanceError` immediately.
3. **Cache Invalidation**: All memoized ancestor and permission caches are safely invalidated when any new inheritance relationship is registered.

---

## Wildcard Permissions

The library uses a highly optimized compile-once caching engine (`WildcardMatcher`) to evaluate wildcard patterns.

### Supported Wildcard Formats

- `*` (Global Wildcard): Grants access to every single operation in the system.
- `patient.*` (Prefix Wildcard): Grants access to any sub-segment matching `patient.` (e.g., `patient.view`, `patient.edit.cardiology`).
- `user.*.view` (Segment Wildcard): Matches variations matching the wildcards in deep structures.

---

## API Reference

### `AccessControl`

#### `role(name: string): RoleBuilder`
Registers a unique role name. Returns a `RoleBuilder` to support fluent inheritance chaining. Throws `InvalidRoleError` if name is empty/whitespace, and `RoleAlreadyExistsError` if the name exists.

#### `permission(permission: string): Permission`
Registers a unique permission pattern. Throws `InvalidPermissionError` if structure is invalid, and `PermissionAlreadyExistsError` if the permission already exists.

#### `grant(roleName: string, permission: string): void`
Grants a registered permission to an existing role. Throws `RoleNotFoundError` or `PermissionNotFoundError` if targets are missing.

#### `assignRole(userId: string, roleName: string): void`
Assigns a role to a user. Throws `RoleNotFoundError` if the role does not exist.

#### `removeRole(userId: string, roleName: string): void`
Removes an assigned role from a user. Throws `RoleNotFoundError` if the role does not exist.

#### `getRoles(userId: string): string[]`
Returns all role names currently assigned to the user. Returns an empty array if none.

#### `can(user: User, permission: string): boolean`
Evaluates whether user has access to the target permission. Runs in `O(number_of_user_roles)` complexity.

---

## Custom Errors

| Error Class | Triggered When |
| :--- | :--- |
| `RoleAlreadyExistsError` | Registering an existing role name |
| `PermissionAlreadyExistsError` | Registering an existing permission pattern |
| `RoleNotFoundError` | Referencing or assigning a non-existent role |
| `PermissionNotFoundError` | Mapping a non-existent permission |
| `InvalidRoleError` | Providing empty or whitespace-only role names |
| `InvalidPermissionError` | Structuring a invalid permission string (e.g. `***`, `user.`, `.` ) |

---

## Best Practices

1. **Register up-front**: Register all roles and permissions inside an initialization phase or app-bootstrap sequence to ensure validation and consistency.
2. **Prefer Narrow Roles**: Assign multiple narrow roles to a user rather than bloating a single role. The library is optimized to check multiple roles instantly.
3. **Use Wildcards Sparingly**: While wildcard checks are extremely fast, keeping wildcard permissions concise improves visual auditability and keeps configuration straightforward.

---

## Contributing

Contributions are welcome! Please follow these standards:
- Write comprehensive tests for any new capability (target 90%+ coverage).
- Format code via Prettier (`pnpm run format` or equivalent).
- Verify compilation before submitting pull requests (`pnpm build` and `pnpm typecheck`).

---

## License

MIT © Access Control Kit Authors.
