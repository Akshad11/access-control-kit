import { describe, it, expect, beforeEach } from 'vitest';
import { AccessControl } from '../src/AccessControl.js';

describe('Performance Stress Verification Suite', () => {
  let auth: AccessControl;

  beforeEach(() => {
    auth = new AccessControl();
  });

  it('should support 1000 roles, 1000 permissions, 100 tenants, and 10000 checks under 1ms average lookup time', () => {
    // 1. Register 100 tenants
    const tenantIds: string[] = [];
    for (let i = 0; i < 100; i++) {
      const id = `tenant-${i}`;
      auth.tenant(id);
      tenantIds.push(id);
    }

    // 2. Register 1000 permissions
    const permissionNames: string[] = [];
    for (let i = 0; i < 1000; i++) {
      const perm = `resource_${i}.action_${i}`;
      auth.permission(perm);
      permissionNames.push(perm);
    }

    // 3. Register 1000 roles
    const roleNames: string[] = [];
    for (let i = 0; i < 1000; i++) {
      const role = `Role_${i}`;
      auth.role(role);
      roleNames.push(role);
    }

    // 4. Map permissions to roles (Role i gets permission i)
    for (let i = 0; i < 1000; i++) {
      auth.grant(roleNames[i], permissionNames[i]);
    }

    // 5. Build inheritance chains (Role i inherits Role i-1 recursively, up to 20 levels)
    // To prevent exceeding recursion limits, we create multiple small chains rather than a flat 1000 level chain.
    for (let i = 1; i < 1000; i++) {
      if (i % 20 !== 0) {
        auth.role(roleNames[i]).inherits(roleNames[i - 1]);
      }
    }

    // 6. Assign roles to 100 users across different tenants
    const users: { id: string; tenantId: string; roleName: string; permissionName: string }[] = [];
    for (let u = 0; u < 100; u++) {
      const userId = `user-${u}`;
      const tenantId = tenantIds[u % 100];
      const roleIndex = (u * 10) % 1000;
      const roleName = roleNames[roleIndex];
      const permissionName = permissionNames[roleIndex];

      auth.assignRole(userId, roleName, tenantId);
      users.push({ id: userId, tenantId, roleName, permissionName });
    }

    // 7. Perform 10000 permission checks and measure execution times
    const start = performance.now();
    for (let i = 0; i < 10000; i++) {
      const targetUser = users[i % users.length];
      // Expect true when matching the user's role
      const hasAccess = auth.can({ id: targetUser.id }, targetUser.permissionName, {
        tenantId: targetUser.tenantId,
      });
      expect(hasAccess).toBe(true);

      // Expect false for a mismatched organization/tenant context
      const mismatchedTenant = tenantIds[(tenantIds.indexOf(targetUser.tenantId) + 1) % 100];
      const hasMismatchedAccess = auth.can({ id: targetUser.id }, targetUser.permissionName, {
        tenantId: mismatchedTenant,
      });
      expect(hasMismatchedAccess).toBe(false);
    }
    const end = performance.now();
    const duration = end - start;
    const avgTime = duration / 10000;

    console.log(`Stress Test Executed 10000 checks in ${duration.toFixed(2)}ms (Average: ${avgTime.toFixed(4)}ms per check)`);

    // Verify average lookup time is well under 1ms
    expect(avgTime).toBeLessThan(1.0);
  });
});
