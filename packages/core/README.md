# Access Control Kit (`@access-control-kit/core`)

An enterprise-ready, high-performance, strongly-typed Role-Based Access Control (RBAC) and Wildcard Permission authorization library for TypeScript and JavaScript.

---

## Features

- ⚡ **High Performance**: Permission evaluations resolved in `O(number_of_user_roles)` complexity, avoiding full permission list scans with a double-nested cache.
- 🎯 **Wildcard Permissions**: Support for flexible patterns (e.g., `*`, `patient.*`, `user.*`) using compiled and cached regular expression matcher.
- 🛡️ **User Overrides**: Assign direct Allow or Deny overrides per user with absolute priority over role grants.
- 🔗 **Role Inheritance**: Support hierarchical roles with recursive permission inheritance and cycle prevention.
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

---

## User Overrides

User-specific permission overrides allow you to grant or deny permissions directly to individual users. User overrides take absolute precedence over role-based permissions and role inheritance.

### Priority Resolution Hierarchy

When checking permissions with `auth.can()`, the library evaluates rules in this exact order:

1. **User Deny (Priority 1)**: If a user has a direct exact or wildcard deny override matching the permission, access is **denied**.
2. **User Allow (Priority 2)**: If a user has a direct exact or wildcard allow override matching the permission, access is **granted**.
3. **Direct Role - Exact (Priority 3)**: If any role directly assigned to the user grants the exact permission, access is **granted**.
4. **Inherited Role - Exact (Priority 4)**: If any inherited parent role grants the exact permission, access is **granted**.
5. **Wildcard Role - Direct/Inherited (Priority 5)**: If any assigned or inherited role grants a wildcard permission that matches, access is **granted**.
6. **Default Deny (Priority 6)**: If no matching rule is found, access is **denied**.

### Example Usage

```typescript
// 1. Register base permissions
auth.permission("invoice.delete");
auth.permission("patient.edit");
auth.permission("patient.*");

// 2. Grant/Deny direct overrides to user
auth.allowUser("user123", "invoice.delete");
auth.denyUser("user123", "patient.edit");

// 3. Perform Checks
auth.can({ id: "user123" }, "invoice.delete"); // true (Allow override takes precedence)
auth.can({ id: "user123" }, "patient.edit");    // false (Deny override takes precedence)

// 4. Wildcard Overrides
auth.allowUser("user456", "patient.*");
auth.can({ id: "user456" }, "patient.create"); // true

// 5. Retrieve Overrides
const overrides = auth.getUserOverrides("user123");
console.log(overrides); // { allow: ["invoice.delete"], deny: ["patient.edit"] }

// 6. Remove Overrides
auth.removeUserAllow("user123", "invoice.delete");
auth.removeUserDeny("user123", "patient.edit");
```

### Cache Mechanics & Performance

- **Warm Cache Resolution**: When a permission is checked, the resolved value is cached inside a double-nested cache mapped by `userId -> permission -> allowed`. Subsequent checks run in $O(1)$ complexity.
- **Granular Cache Invalidation**:
  - Overriding a user's permissions (`allowUser`, `denyUser`, `removeUserAllow`, `removeUserDeny`) or assigning/removing user roles automatically purges the cache specifically for that user.
  - Modifying global role grants or inheritance maps automatically invalidates the entire cache to ensure system-wide consistency.

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

#### `allowUser(userId: string, permission: string): void`
Registers a user-specific permission allow override. Throws `PermissionNotFoundError` if the permission is not registered.

#### `denyUser(userId: string, permission: string): void`
Registers a user-specific permission deny override. Throws `PermissionNotFoundError` if the permission is not registered.

#### `removeUserAllow(userId: string, permission: string): void`
Removes a user-specific permission allow override. Throws `UserOverrideNotFoundError` if the allow override does not exist.

#### `removeUserDeny(userId: string, permission: string): void`
Removes a user-specific permission deny override. Throws `UserOverrideNotFoundError` if the deny override does not exist.

#### `getUserOverrides(userId: string): UserOverrides`
Retrieves all custom overrides registered for a user. Returns a `UserOverrides` structure mapping `allow` and `deny` permission arrays.

#### `can(user: User, permission: string): boolean`
Evaluates whether user has access to the target permission. Runs in `O(1)` warm cache complexity.

---

## Custom Errors

| Error Class | Triggered When |
| :--- | :--- |
| `RoleAlreadyExistsError` | Registering an existing role name |
| `PermissionAlreadyExistsError` | Registering an existing permission pattern |
| `RoleNotFoundError` | Referencing or assigning a non-existent role |
| `PermissionNotFoundError` | Mapping a non-existent permission |
| `InvalidRoleError` | Providing empty or whitespace-only role names |
| `InvalidPermissionError` | Structuring an invalid permission string (e.g. `***`, `user.`, `.` ) |
| `UserOverrideNotFoundError` | Trying to remove a non-existent user allow or deny override |

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
