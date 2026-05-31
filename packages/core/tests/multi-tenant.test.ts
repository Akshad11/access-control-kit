import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AccessControl } from '../src/AccessControl.js';
import {
  TenantAlreadyExistsError,
  TenantNotFoundError,
  TenantContextRequiredError,
} from '../src/errors.js';

describe('Multi-Tenant Integration', () => {
  let auth: AccessControl;

  beforeEach(() => {
    vi.useFakeTimers();
    auth = new AccessControl();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should successfully register a tenant and reject duplicates', () => {
    auth.tenant('tenant-a', 'Tenant A Org');

    // Registering duplicate should throw TenantAlreadyExistsError
    expect(() => auth.tenant('tenant-a')).toThrow(TenantAlreadyExistsError);

    // Validate bad inputs
    expect(() => auth.tenant('')).toThrow(TenantContextRequiredError);
    expect(() => auth.tenant('   ')).toThrow(TenantContextRequiredError);
    expect(() => auth.tenant(null as any)).toThrow(TenantContextRequiredError);
  });

  it('should throw TenantContextRequiredError when multi-tenant is active but context is missing', () => {
    auth.tenant('tenant-a');
    auth.permission('invoice.delete');

    const user = { id: 'u1' };

    // Missing context
    expect(() => auth.can(user, 'invoice.delete')).toThrow(TenantContextRequiredError);

    // Missing tenantId inside context
    expect(() => auth.can(user, 'invoice.delete', {} as any)).toThrow(TenantContextRequiredError);
    expect(() => auth.can(user, 'invoice.delete', { tenantId: '' })).toThrow(
      TenantContextRequiredError
    );
    expect(() => auth.can(user, 'invoice.delete', { tenantId: '  ' })).toThrow(
      TenantContextRequiredError
    );
  });

  it('should throw TenantNotFoundError when context provides an unregistered tenant', () => {
    auth.tenant('tenant-a');
    auth.permission('invoice.delete');

    expect(() =>
      auth.can({ id: 'u1' }, 'invoice.delete', { tenantId: 'unregistered-tenant' })
    ).toThrow(TenantNotFoundError);
  });

  it('should isolate user roles by tenant context (Role Isolation)', () => {
    auth.tenant('tenant-a');
    auth.tenant('tenant-b');

    auth.role('Admin');
    auth.role('Employee');

    auth.permission('patient.edit');
    auth.permission('patient.view');

    auth.grant('Admin', 'patient.edit');
    auth.grant('Employee', 'patient.view');

    // Assign roles per tenant
    auth.assignRole('u1', 'Admin', 'tenant-a');
    auth.assignRole('u1', 'Employee', 'tenant-b');

    const user = { id: 'u1' };

    // Tenant A checks (Admin - gets patient.edit, but not patient.view unless inherited/granted)
    expect(auth.can(user, 'patient.edit', { tenantId: 'tenant-a' })).toBe(true);
    expect(auth.can(user, 'patient.view', { tenantId: 'tenant-a' })).toBe(false);

    // Tenant B checks (Employee - gets patient.view, but not patient.edit)
    expect(auth.can(user, 'patient.edit', { tenantId: 'tenant-b' })).toBe(false);
    expect(auth.can(user, 'patient.view', { tenantId: 'tenant-b' })).toBe(true);

    // Get roles is also isolated
    expect(auth.getRoles('u1', 'tenant-a')).toEqual(['Admin']);
    expect(auth.getRoles('u1', 'tenant-b')).toEqual(['Employee']);
  });

  it('should isolate user overrides by tenant context (Override Isolation)', () => {
    auth.tenant('tenant-a');
    auth.tenant('tenant-b');

    auth.permission('invoice.delete');

    // Allow override only in tenant-a
    auth.allowUser('u1', 'invoice.delete', 'tenant-a');

    const user = { id: 'u1' };

    expect(auth.can(user, 'invoice.delete', { tenantId: 'tenant-a' })).toBe(true);
    expect(auth.can(user, 'invoice.delete', { tenantId: 'tenant-b' })).toBe(false);

    // Deny override only in tenant-b
    auth.role('Admin');
    auth.grant('Admin', 'invoice.delete');
    auth.assignRole('u1', 'Admin', 'tenant-a');
    auth.assignRole('u1', 'Admin', 'tenant-b');

    auth.denyUser('u1', 'invoice.delete', 'tenant-b');

    expect(auth.can(user, 'invoice.delete', { tenantId: 'tenant-a' })).toBe(true);  // Allowed by role & override
    expect(auth.can(user, 'invoice.delete', { tenantId: 'tenant-b' })).toBe(false); // Denied by override in tenant-b
  });

  it('should isolate temporary permissions by tenant context (Temporary Permission Isolation)', () => {
    auth.tenant('tenant-a');
    auth.tenant('tenant-b');

    auth.permission('report.export');
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

    auth.grantTemporary({
      userId: 'u1',
      permission: 'report.export',
      tenantId: 'tenant-a',
      expiresAt: tomorrow,
    });

    const user = { id: 'u1' };

    expect(auth.can(user, 'report.export', { tenantId: 'tenant-a' })).toBe(true);
    expect(auth.can(user, 'report.export', { tenantId: 'tenant-b' })).toBe(false);

    // Revoking temporary permission is also scoped
    expect(() => auth.revokeTemporary('u1', 'report.export', 'tenant-b')).toThrow();
    auth.revokeTemporary('u1', 'report.export', 'tenant-a');
    expect(auth.can(user, 'report.export', { tenantId: 'tenant-a' })).toBe(false);
  });

  it('should guarantee cache isolation between tenants', () => {
    auth.tenant('tenant-a');
    auth.tenant('tenant-b');

    auth.role('Admin');
    auth.permission('patient.edit');
    auth.grant('Admin', 'patient.edit');

    auth.assignRole('u1', 'Admin', 'tenant-a');

    const user = { id: 'u1' };

    // Warm up cache for tenant-a (allowed) and tenant-b (denied)
    expect(auth.can(user, 'patient.edit', { tenantId: 'tenant-a' })).toBe(true);
    expect(auth.can(user, 'patient.edit', { tenantId: 'tenant-b' })).toBe(false);

    // Dynamic mutation in tenant-b should NOT invalidate tenant-a's cache
    auth.assignRole('u1', 'Admin', 'tenant-b');

    // Tenant B cache should refresh and allow access
    expect(auth.can(user, 'patient.edit', { tenantId: 'tenant-b' })).toBe(true);
    expect(auth.can(user, 'patient.edit', { tenantId: 'tenant-a' })).toBe(true); // Tenant A still allowed
  });

  it('should support wildcard permissions scoped to tenant context', () => {
    auth.tenant('tenant-a');
    auth.tenant('tenant-b');

    auth.role('Manager');
    auth.permission('patient.*');
    auth.permission('patient.create');

    auth.grant('Manager', 'patient.*');
    auth.assignRole('u1', 'Manager', 'tenant-a');

    const user = { id: 'u1' };

    // Wildcard matches in tenant-a
    expect(auth.can(user, 'patient.create', { tenantId: 'tenant-a' })).toBe(true);

    // Wildcard has no effect in tenant-b
    expect(auth.can(user, 'patient.create', { tenantId: 'tenant-b' })).toBe(false);
  });

  it('should support role inheritance recursively inside each tenant', () => {
    auth.tenant('tenant-a');
    auth.tenant('tenant-b');

    auth.role('Employee');
    auth.role('Manager').inherits('Employee');
    auth.role('Admin').inherits('Manager');

    auth.permission('patient.view');
    auth.grant('Employee', 'patient.view');

    // u1 is Admin in tenant-a (inherits Employee)
    auth.assignRole('u1', 'Admin', 'tenant-a');

    // u2 is just a guest in tenant-b
    const u1 = { id: 'u1' };
    const u2 = { id: 'u2' };

    expect(auth.can(u1, 'patient.view', { tenantId: 'tenant-a' })).toBe(true);
    expect(auth.can(u1, 'patient.view', { tenantId: 'tenant-b' })).toBe(false);
    expect(auth.can(u2, 'patient.view', { tenantId: 'tenant-b' })).toBe(false);
  });

  it('should maintain user overrides priority hierarchy per tenant', () => {
    auth.tenant('tenant-a');
    auth.role('Admin');
    auth.permission('invoice.delete');
    auth.grant('Admin', 'invoice.delete');

    auth.assignRole('u1', 'Admin', 'tenant-a');

    // Direct User Deny override takes absolute priority
    auth.denyUser('u1', 'invoice.delete', 'tenant-a');

    expect(auth.can({ id: 'u1' }, 'invoice.delete', { tenantId: 'tenant-a' })).toBe(false);
  });

  it('should support temporary permission priority inside a tenant context', () => {
    auth.tenant('tenant-a');
    auth.permission('report.export');

    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // No roles assigned, but temporary permission grants access
    auth.grantTemporary({
      userId: 'u1',
      permission: 'report.export',
      tenantId: 'tenant-a',
      expiresAt: tomorrow,
    });

    expect(auth.can({ id: 'u1' }, 'report.export', { tenantId: 'tenant-a' })).toBe(true);
  });

  it('should safely validate and throw when trying to assign to missing or unregistered tenants', () => {
    auth.tenant('tenant-a');
    auth.role('Admin');
    auth.permission('invoice.delete');

    // Missing tenant context in mutations when multi-tenant is active
    expect(() => auth.assignRole('u1', 'Admin')).toThrow(TenantContextRequiredError);
    expect(() => auth.removeRole('u1', 'Admin')).toThrow(TenantContextRequiredError);
    expect(() => auth.allowUser('u1', 'invoice.delete')).toThrow(TenantContextRequiredError);
    expect(() => auth.denyUser('u1', 'invoice.delete')).toThrow(TenantContextRequiredError);
    expect(() => auth.grantTemporary({ userId: 'u1', permission: 'invoice.delete', expiresAt: new Date(Date.now() + 1000) })).toThrow(TenantContextRequiredError);
    expect(() => auth.revokeTemporary('u1', 'invoice.delete')).toThrow(TenantContextRequiredError);

    // Unregistered tenant in mutations
    expect(() => auth.assignRole('u1', 'Admin', 'unknown')).toThrow(TenantNotFoundError);
    expect(() => auth.removeRole('u1', 'Admin', 'unknown')).toThrow(TenantNotFoundError);
  });

  it('should support invalidating all caches for a specific user ID directly', () => {
    auth.permission('invoice.delete');
    auth.allowUser('u1', 'invoice.delete', 'tenant-a');
    expect(auth.can({ id: 'u1' }, 'invoice.delete', { tenantId: 'tenant-a' })).toBe(true);

    // Access resolver directly to call invalidateUserCache
    (auth as any).permissionResolver.invalidateUserCache('u1');

    // Cache is cleared, re-evaluates cleanly
    expect(auth.can({ id: 'u1' }, 'invoice.delete', { tenantId: 'tenant-a' })).toBe(true);
  });
});
