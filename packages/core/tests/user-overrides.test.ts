import { describe, it, expect, beforeEach } from 'vitest';
import { AccessControl } from '../src/AccessControl.js';
import {
  PermissionNotFoundError,
  UserOverrideNotFoundError,
} from '../src/errors.js';

describe('User Overrides Integration', () => {
  let auth: AccessControl;

  beforeEach(() => {
    auth = new AccessControl();
  });

  it('should successfully allow a user permission directly (Allow User)', () => {
    auth.permission('invoice.delete');
    auth.allowUser('u1', 'invoice.delete');

    // u1 has no roles, but is allowed 'invoice.delete' directly
    expect(auth.can({ id: 'u1' }, 'invoice.delete')).toBe(true);
    expect(auth.can({ id: 'u1' }, 'patient.view')).toBe(false);
  });

  it('should successfully deny a user permission directly (Deny User)', () => {
    auth.role('Employee');
    auth.permission('patient.edit');
    auth.grant('Employee', 'patient.edit');

    auth.assignRole('u1', 'Employee');
    auth.denyUser('u1', 'patient.edit');

    // u1 has Employee role which grants patient.edit, but the User Deny override takes absolute precedence
    expect(auth.can({ id: 'u1' }, 'patient.edit')).toBe(false);
  });

  it('should have Deny overrides take absolute precedence over wildcard role grants (Deny Overrides Role)', () => {
    auth.role('Admin');
    auth.permission('*');
    auth.permission('patient.delete');

    auth.grant('Admin', '*');
    auth.assignRole('u1', 'Admin');
    auth.denyUser('u1', 'patient.delete');

    // Admin has '*' global wildcard grant, but User Deny 'patient.delete' overrides it
    expect(auth.can({ id: 'u1' }, 'patient.delete')).toBe(false);
    expect(auth.can({ id: 'u1' }, 'user.create')).toBe(true); // Other operations allowed
  });

  it('should support Allow overrides working with missing roles (Allow Overrides Missing Role)', () => {
    auth.permission('invoice.delete');
    auth.allowUser('u1', 'invoice.delete');

    // User u1 has no roles assigned
    expect(auth.can({ id: 'u1' }, 'invoice.delete')).toBe(true);
  });

  it('should support Wildcard Allow overrides (patient.*)', () => {
    auth.permission('patient.*');
    auth.permission('patient.create');
    auth.permission('patient.edit');
    auth.permission('patient.delete');
    auth.permission('user.delete');

    auth.allowUser('u1', 'patient.*');

    expect(auth.can({ id: 'u1' }, 'patient.create')).toBe(true);
    expect(auth.can({ id: 'u1' }, 'patient.edit')).toBe(true);
    expect(auth.can({ id: 'u1' }, 'patient.delete')).toBe(true);
    expect(auth.can({ id: 'u1' }, 'user.delete')).toBe(false);
  });

  it('should support Wildcard Deny overrides (invoice.*)', () => {
    auth.role('Admin');
    auth.permission('*');
    auth.permission('invoice.*');
    auth.permission('invoice.create');
    auth.permission('invoice.delete');
    auth.permission('invoice.view');

    auth.grant('Admin', '*');
    auth.assignRole('u1', 'Admin');
    auth.denyUser('u1', 'invoice.*');

    expect(auth.can({ id: 'u1' }, 'invoice.create')).toBe(false);
    expect(auth.can({ id: 'u1' }, 'invoice.delete')).toBe(false);
    expect(auth.can({ id: 'u1' }, 'invoice.view')).toBe(false);
    expect(auth.can({ id: 'u1' }, 'user.delete')).toBe(true);
  });

  it('should throw PermissionNotFoundError when overriding an unregistered permission', () => {
    expect(() => auth.allowUser('u1', 'unregistered.permission')).toThrow(PermissionNotFoundError);
    expect(() => auth.denyUser('u1', 'unregistered.permission')).toThrow(PermissionNotFoundError);
  });

  it('should successfully remove user allow overrides and throw if non-existent', () => {
    auth.permission('invoice.delete');
    auth.allowUser('u1', 'invoice.delete');

    expect(auth.getUserOverrides('u1').allow).toContain('invoice.delete');

    auth.removeUserAllow('u1', 'invoice.delete');
    expect(auth.getUserOverrides('u1').allow).not.toContain('invoice.delete');

    // Removing again should throw UserOverrideNotFoundError
    expect(() => auth.removeUserAllow('u1', 'invoice.delete')).toThrow(UserOverrideNotFoundError);
    try {
      auth.removeUserAllow('u1', 'invoice.delete');
    } catch (e: any) {
      expect(e.name).toBe('UserOverrideNotFoundError');
      expect(e.message).toBe('No allow override found for user "u1" and permission "invoice.delete".');
    }
  });

  it('should successfully remove user deny overrides and throw if non-existent', () => {
    auth.permission('patient.edit');
    auth.denyUser('u1', 'patient.edit');

    expect(auth.getUserOverrides('u1').deny).toContain('patient.edit');

    auth.removeUserDeny('u1', 'patient.edit');
    expect(auth.getUserOverrides('u1').deny).not.toContain('patient.edit');

    // Removing again should throw UserOverrideNotFoundError
    expect(() => auth.removeUserDeny('u1', 'patient.edit')).toThrow(UserOverrideNotFoundError);
  });

  it('should correctly invalidate and refresh the user permission cache on modifications', () => {
    auth.permission('invoice.delete');
    auth.allowUser('u1', 'invoice.delete');

    // Warm up cache
    expect(auth.can({ id: 'u1' }, 'invoice.delete')).toBe(true);

    // Dynamic allow removal invalidates u1's cache
    auth.removeUserAllow('u1', 'invoice.delete');

    // Evaluated value has updated cleanly
    expect(auth.can({ id: 'u1' }, 'invoice.delete')).toBe(false);
  });

  it('should hit the warm cache on subsequent permission checks', () => {
    auth.permission('invoice.delete');
    auth.allowUser('u1', 'invoice.delete');

    // First check (cold cache)
    expect(auth.can({ id: 'u1' }, 'invoice.delete')).toBe(true);

    // Second check (warm cache hit)
    expect(auth.can({ id: 'u1' }, 'invoice.delete')).toBe(true);
  });

  it('should maintain user overrides priority in combination with Role Inheritance', () => {
    auth.role('Employee');
    auth.role('Manager').inherits('Employee');
    auth.role('Admin').inherits('Manager');

    auth.permission('patient.view');
    auth.permission('patient.edit');
    auth.permission('user.delete');

    auth.grant('Employee', 'patient.view');
    auth.grant('Manager', 'patient.edit');
    auth.grant('Admin', 'user.delete');

    auth.assignRole('u1', 'Admin');

    // Overrides deny patient.view, but allow a custom one
    auth.denyUser('u1', 'patient.view');

    // Admin ordinarily inherits patient.view, but user deny override takes precedence
    expect(auth.can({ id: 'u1' }, 'patient.view')).toBe(false);
    expect(auth.can({ id: 'u1' }, 'patient.edit')).toBe(true); // Other inheritance works
  });

  it('should clear all user overrides correctly on clear()', () => {
    auth.permission('invoice.delete');
    auth.allowUser('u1', 'invoice.delete');

    auth.clear();

    expect(auth.getUserOverrides('u1').allow).toHaveLength(0);
    expect(auth.can({ id: 'u1' }, 'invoice.delete')).toBe(false);
  });
});
