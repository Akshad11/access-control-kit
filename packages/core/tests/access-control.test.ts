import { describe, it, expect, beforeEach } from 'vitest';
import { AccessControl } from '../src/AccessControl';

describe('AccessControl Integration', () => {
  let auth: AccessControl;

  beforeEach(() => {
    auth = new AccessControl();
  });

  it('should handle role, permission registration and direct grants', () => {
    auth.role('Admin');
    auth.permission('user.create');
    auth.permission('user.delete');

    auth.grant('Admin', 'user.create');
    auth.grant('Admin', 'user.delete');

    auth.assignRole('user1', 'Admin');

    expect(auth.can({ id: 'user1' }, 'user.create')).toBe(true);
    expect(auth.can({ id: 'user1' }, 'user.delete')).toBe(true);
    expect(auth.can({ id: 'user1' }, 'user.update')).toBe(false);
  });

  it('should handle multiple roles resolution', () => {
    auth.role('Manager');
    auth.role('Employee');

    auth.permission('patient.view');
    auth.permission('patient.create');

    auth.grant('Manager', 'patient.create');
    auth.grant('Employee', 'patient.view');

    auth.assignRole('user1', 'Manager');
    auth.assignRole('user1', 'Employee');

    expect(auth.can({ id: 'user1' }, 'patient.create')).toBe(true);
    expect(auth.can({ id: 'user1' }, 'patient.view')).toBe(true);
    expect(auth.can({ id: 'user1' }, 'patient.delete')).toBe(false);
  });

  it('should resolve global wildcard * correctly', () => {
    auth.role('Admin');
    auth.permission('*');
    auth.permission('user.create');
    auth.permission('patient.view');

    auth.grant('Admin', '*');
    auth.assignRole('u1', 'Admin');

    expect(auth.can({ id: 'u1' }, 'user.create')).toBe(true);
    expect(auth.can({ id: 'u1' }, 'patient.view')).toBe(true);
  });

  it('should resolve segment wildcard prefix correctly', () => {
    auth.role('Manager');
    auth.permission('patient.*');
    auth.permission('patient.create');
    auth.permission('patient.delete');
    auth.permission('user.delete');

    auth.grant('Manager', 'patient.*');
    auth.assignRole('u2', 'Manager');

    expect(auth.can({ id: 'u2' }, 'patient.create')).toBe(true);
    expect(auth.can({ id: 'u2' }, 'patient.delete')).toBe(true);
    expect(auth.can({ id: 'u2' }, 'user.delete')).toBe(false);
  });

  it('should return false for invalid user shapes or user with no roles', () => {
    auth.role('Admin');
    auth.permission('user.create');
    auth.grant('Admin', 'user.create');

    expect(auth.can(null as any, 'user.create')).toBe(false);
    expect(auth.can({} as any, 'user.create')).toBe(false);
    expect(auth.can({ id: 'u_no_roles' }, 'user.create')).toBe(false);
    expect(auth.can({ id: 123 as any }, 'user.create')).toBe(false);
  });

  it('should support checking roles assigned to a user', () => {
    auth.role('Admin');
    auth.assignRole('u1', 'Admin');
    expect(auth.getRoles('u1')).toEqual(['Admin']);
  });

  it('should support retrieving permissions granted to a role', () => {
    auth.role('Admin');
    auth.permission('user.create');
    auth.grant('Admin', 'user.create');
    expect(auth.getGrants('Admin')).toContain('user.create');
  });

  it('should support stateless checks by passing user roles directly', () => {
    auth.role('Manager');
    auth.permission('patient.*');
    auth.grant('Manager', 'patient.*');

    // User has no roles assigned in-memory, but has 'Manager' passed dynamically
    const user = { id: 'u1', roles: ['Manager'] };
    expect(auth.can(user, 'patient.view')).toBe(true);
    expect(auth.can(user, 'user.create')).toBe(false);
  });

  it('should support removing roles from user', () => {
    auth.role('Admin');
    auth.assignRole('u1', 'Admin');
    auth.removeRole('u1', 'Admin');
    expect(auth.getRoles('u1')).toEqual([]);
  });

  it('should clear internal states correctly', () => {
    auth.role('Admin');
    auth.permission('user.create');
    auth.grant('Admin', 'user.create');
    auth.assignRole('u1', 'Admin');

    auth.clear();

    expect(auth.getRoles('u1')).toEqual([]);
    expect(auth.can({ id: 'u1' }, 'user.create')).toBe(false);
  });
});
