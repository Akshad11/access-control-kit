import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AccessControl } from '../src/AccessControl.js';
import {
  PermissionNotFoundError,
  InvalidExpirationDateError,
  TemporaryPermissionNotFoundError,
} from '../src/errors.js';

describe('Temporary Permissions Integration', () => {
  let auth: AccessControl;

  beforeEach(() => {
    vi.useFakeTimers();
    auth = new AccessControl();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should successfully grant a temporary permission', () => {
    auth.permission('invoice.delete');
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

    auth.grantTemporary({
      userId: 'u1',
      permission: 'invoice.delete',
      expiresAt: tomorrow,
    });

    expect(auth.can({ id: 'u1' }, 'invoice.delete')).toBe(true);
    expect(auth.getTemporaryPermissions('u1')).toEqual([
      { permission: 'invoice.delete', expiresAt: tomorrow },
    ]);
  });

  it('should automatically deny access after temporary permission expires', () => {
    auth.permission('invoice.delete');
    const oneHour = 60 * 60 * 1000;
    const expires = new Date(Date.now() + oneHour);

    auth.grantTemporary({
      userId: 'u1',
      permission: 'invoice.delete',
      expiresAt: expires,
    });

    // Check while active
    expect(auth.can({ id: 'u1' }, 'invoice.delete')).toBe(true);

    // Fast-forward time past expiration
    vi.advanceTimersByTime(oneHour + 1000);

    // Should now be denied
    expect(auth.can({ id: 'u1' }, 'invoice.delete')).toBe(false);
  });

  it('should successfully revoke an active temporary permission', () => {
    auth.permission('report.export');
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

    auth.grantTemporary({
      userId: 'u1',
      permission: 'report.export',
      expiresAt: tomorrow,
    });

    expect(auth.can({ id: 'u1' }, 'report.export')).toBe(true);

    auth.revokeTemporary('u1', 'report.export');

    expect(auth.can({ id: 'u1' }, 'report.export')).toBe(false);
    expect(auth.getTemporaryPermissions('u1')).toHaveLength(0);
  });

  it('should support multiple temporary permissions independently for a user', () => {
    auth.permission('report.export');
    auth.permission('report.view');
    auth.permission('report.delete');

    const oneHour = 60 * 60 * 1000;
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

    auth.grantTemporary({
      userId: 'u1',
      permission: 'report.export',
      expiresAt: new Date(Date.now() + oneHour),
    });

    auth.grantTemporary({
      userId: 'u1',
      permission: 'report.view',
      expiresAt: tomorrow,
    });

    expect(auth.can({ id: 'u1' }, 'report.export')).toBe(true);
    expect(auth.can({ id: 'u1' }, 'report.view')).toBe(true);
    expect(auth.can({ id: 'u1' }, 'report.delete')).toBe(false);

    // Advance past first permission's expiration
    vi.advanceTimersByTime(oneHour + 1000);

    expect(auth.can({ id: 'u1' }, 'report.export')).toBe(false);
    expect(auth.can({ id: 'u1' }, 'report.view')).toBe(true);
  });

  it('should support wildcard temporary permissions and their expiration', () => {
    auth.permission('patient.*');
    auth.permission('patient.create');
    auth.permission('patient.edit');
    auth.permission('user.delete');

    const expires = new Date(Date.now() + 60 * 60 * 1000);

    auth.grantTemporary({
      userId: 'u1',
      permission: 'patient.*',
      expiresAt: expires,
    });

    expect(auth.can({ id: 'u1' }, 'patient.create')).toBe(true);
    expect(auth.can({ id: 'u1' }, 'patient.edit')).toBe(true);
    expect(auth.can({ id: 'u1' }, 'user.delete')).toBe(false);

    vi.advanceTimersByTime(60 * 60 * 1000 + 1000);

    expect(auth.can({ id: 'u1' }, 'patient.create')).toBe(false);
    expect(auth.can({ id: 'u1' }, 'patient.edit')).toBe(false);
  });

  it('should update expiration date and not create duplicate storage on duplicate grants', () => {
    auth.permission('report.export');
    const earlier = new Date(Date.now() + 10 * 1000);
    const later = new Date(Date.now() + 60 * 1000);

    auth.grantTemporary({
      userId: 'u1',
      permission: 'report.export',
      expiresAt: earlier,
    });

    expect(auth.getTemporaryPermissions('u1')).toHaveLength(1);

    auth.grantTemporary({
      userId: 'u1',
      permission: 'report.export',
      expiresAt: later,
    });

    expect(auth.getTemporaryPermissions('u1')).toHaveLength(1);
    expect(auth.getTemporaryPermissions('u1')[0].expiresAt).toEqual(later);

    // Ensure it stays valid past the earlier expiration date
    vi.advanceTimersByTime(15 * 1000);
    expect(auth.can({ id: 'u1' }, 'report.export')).toBe(true);
  });

  it('should invalidate specific user permission cache on grant, revoke, and cleanup', () => {
    auth.permission('invoice.delete');
    const expires = new Date(Date.now() + 10 * 1000);

    // Warm up empty cache
    expect(auth.can({ id: 'u1' }, 'invoice.delete')).toBe(false);

    auth.grantTemporary({
      userId: 'u1',
      permission: 'invoice.delete',
      expiresAt: expires,
    });

    // Cache should be refreshed and allow access
    expect(auth.can({ id: 'u1' }, 'invoice.delete')).toBe(true);

    auth.revokeTemporary('u1', 'invoice.delete');

    // Cache should be refreshed and deny access
    expect(auth.can({ id: 'u1' }, 'invoice.delete')).toBe(false);
  });

  it('should respect User Deny overrides taking precedence over temporary permissions', () => {
    auth.permission('invoice.delete');
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Temporary Allow
    auth.grantTemporary({
      userId: 'u1',
      permission: 'invoice.delete',
      expiresAt: tomorrow,
    });

    // User Deny override
    auth.denyUser('u1', 'invoice.delete');

    // Deny override must take absolute precedence
    expect(auth.can({ id: 'u1' }, 'invoice.delete')).toBe(false);
  });

  it('should coexist cleanly with direct role permissions (RBAC)', () => {
    auth.role('Employee');
    auth.permission('patient.view');
    auth.permission('patient.edit');

    auth.grant('Employee', 'patient.view');
    auth.assignRole('u1', 'Employee');

    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    auth.grantTemporary({
      userId: 'u1',
      permission: 'patient.edit',
      expiresAt: tomorrow,
    });

    expect(auth.can({ id: 'u1' }, 'patient.view')).toBe(true);  // from Role
    expect(auth.can({ id: 'u1' }, 'patient.edit')).toBe(true);  // from Temporary
  });

  it('should coexist cleanly with inherited role permissions', () => {
    auth.role('Employee');
    auth.role('Manager').inherits('Employee');

    auth.permission('patient.view');
    auth.permission('patient.edit');

    auth.grant('Employee', 'patient.view');
    auth.assignRole('u1', 'Manager');

    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    auth.grantTemporary({
      userId: 'u1',
      permission: 'patient.edit',
      expiresAt: tomorrow,
    });

    expect(auth.can({ id: 'u1' }, 'patient.view')).toBe(true);  // from Inheritance
    expect(auth.can({ id: 'u1' }, 'patient.edit')).toBe(true);  // from Temporary
  });

  it('should perform automatic/lazy cleanup of expired permissions when enabled', () => {
    auth.permission('invoice.delete');
    const expires = new Date(Date.now() + 10 * 1000);

    auth.grantTemporary({
      userId: 'u1',
      permission: 'invoice.delete',
      expiresAt: expires,
    });

    expect(auth.getTemporaryPermissions('u1')).toHaveLength(1);

    vi.advanceTimersByTime(15 * 1000);

    // Evaluation triggers lazy cleanup
    expect(auth.can({ id: 'u1' }, 'invoice.delete')).toBe(false);

    // Record is removed automatically
    expect(auth.getTemporaryPermissions('u1')).toHaveLength(0);
  });

  it('should NOT perform lazy cleanup when autoCleanupExpiredPermissions is disabled', () => {
    const customAuth = new AccessControl({ autoCleanupExpiredPermissions: false });
    customAuth.permission('invoice.delete');
    const expires = new Date(Date.now() + 10 * 1000);

    customAuth.grantTemporary({
      userId: 'u1',
      permission: 'invoice.delete',
      expiresAt: expires,
    });

    vi.advanceTimersByTime(15 * 1000);

    // Evaluation checks and correctly denies, but leaves the record in place
    expect(customAuth.can({ id: 'u1' }, 'invoice.delete')).toBe(false);

    // Record remains because lazy cleanup is disabled
    expect(customAuth.getTemporaryPermissions('u1')).toHaveLength(1);
  });

  it('should support manual cleanup of expired permissions and invalidate caches correctly', () => {
    auth.permission('invoice.delete');
    const expires = new Date(Date.now() + 10 * 1000);

    auth.grantTemporary({
      userId: 'u1',
      permission: 'invoice.delete',
      expiresAt: expires,
    });

    vi.advanceTimersByTime(15 * 1000);

    // Manual cleanup
    auth.cleanupExpiredPermissions();

    expect(auth.getTemporaryPermissions('u1')).toHaveLength(0);
  });

  it('should validate expiration Date parameters and throw InvalidExpirationDateError', () => {
    auth.permission('invoice.delete');

    // Invalid parameters check
    expect(() =>
      auth.grantTemporary({
        userId: 'u1',
        permission: 'invoice.delete',
        expiresAt: 'not-a-date' as any,
      })
    ).toThrow(InvalidExpirationDateError);

    expect(() =>
      auth.grantTemporary({
        userId: 'u1',
        permission: 'invoice.delete',
        expiresAt: new Date('invalid date string'),
      })
    ).toThrow(InvalidExpirationDateError);

    // Past date check
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    expect(() =>
      auth.grantTemporary({
        userId: 'u1',
        permission: 'invoice.delete',
        expiresAt: yesterday,
      })
    ).toThrow(InvalidExpirationDateError);
  });

  it('should throw PermissionNotFoundError when granting unregistered permission temporarily', () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    expect(() =>
      auth.grantTemporary({
        userId: 'u1',
        permission: 'unregistered.permission',
        expiresAt: tomorrow,
      })
    ).toThrow(PermissionNotFoundError);
  });

  it('should throw TemporaryPermissionNotFoundError when revoking non-existent temporary permission', () => {
    expect(() => auth.revokeTemporary('u1', 'invoice.delete')).toThrow(
      TemporaryPermissionNotFoundError
    );

    auth.permission('invoice.delete');
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    auth.grantTemporary({
      userId: 'u1',
      permission: 'invoice.delete',
      expiresAt: tomorrow,
    });

    expect(() => auth.revokeTemporary('u1', 'another.permission')).toThrow(
      TemporaryPermissionNotFoundError
    );
  });

  it('should verify clear resets temporary store correctly', () => {
    auth.permission('invoice.delete');
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    auth.grantTemporary({
      userId: 'u1',
      permission: 'invoice.delete',
      expiresAt: tomorrow,
    });

    auth.clear();

    expect(auth.getTemporaryPermissions('u1')).toHaveLength(0);
    expect(auth.can({ id: 'u1' }, 'invoice.delete')).toBe(false);
  });

  it('should support manual cleanup when some records are expired and some are active', () => {
    auth.permission('invoice.delete');
    auth.permission('patient.edit');

    auth.grantTemporary({
      userId: 'u1',
      permission: 'invoice.delete',
      expiresAt: new Date(Date.now() + 10 * 1000),
    });

    auth.grantTemporary({
      userId: 'u1',
      permission: 'patient.edit',
      expiresAt: new Date(Date.now() + 60 * 1000),
    });

    vi.advanceTimersByTime(15 * 1000);

    // Manual cleanup should remove invoice.delete and retain patient.edit
    auth.cleanupExpiredPermissions();

    const current = auth.getTemporaryPermissions('u1');
    expect(current).toHaveLength(1);
    expect(current[0].permission).toBe('patient.edit');
  });
});
