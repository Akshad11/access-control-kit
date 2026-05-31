import { describe, it, expect, beforeEach } from 'vitest';
import { AccessControl } from '../src/AccessControl.js';
import {
  CircularRoleInheritanceError,
  InheritanceRoleNotFoundError,
} from '../src/errors.js';

describe('Role Inheritance Integration', () => {
  let auth: AccessControl;

  beforeEach(() => {
    auth = new AccessControl();
  });

  it('should handle single inheritance (Employee <- Manager)', () => {
    auth.role('Employee');
    auth.role('Manager').inherits('Employee');

    auth.permission('patient.view');
    auth.grant('Employee', 'patient.view');

    auth.assignRole('u_emp', 'Employee');
    auth.assignRole('u_mgr', 'Manager');

    // Employee has access
    expect(auth.can({ id: 'u_emp' }, 'patient.view')).toBe(true);

    // Manager inherits access
    expect(auth.can({ id: 'u_mgr' }, 'patient.view')).toBe(true);

    // Manager does not have random permissions
    expect(auth.can({ id: 'u_mgr' }, 'user.create')).toBe(false);
  });

  it('should handle multi-level inheritance (Employee <- Manager <- Admin)', () => {
    auth.role('Employee');
    auth.role('Manager').inherits('Employee');
    auth.role('Admin').inherits('Manager');

    auth.permission('patient.view');
    auth.permission('patient.edit');
    auth.permission('user.delete');

    auth.grant('Employee', 'patient.view');
    auth.grant('Manager', 'patient.edit');
    auth.grant('Admin', 'user.delete');

    auth.assignRole('u_admin', 'Admin');

    // Admin inherits everything in the chain
    expect(auth.can({ id: 'u_admin' }, 'patient.view')).toBe(true);
    expect(auth.can({ id: 'u_admin' }, 'patient.edit')).toBe(true);
    expect(auth.can({ id: 'u_admin' }, 'user.delete')).toBe(true);
  });

  it('should handle multiple inheritance (Supervisor <- Employee & Supervisor <- Auditor)', () => {
    auth.role('Employee');
    auth.role('Auditor');
    auth.role('Supervisor')
      .inherits('Employee')
      .inherits('Auditor');

    auth.permission('patient.view');
    auth.permission('audit.log');
    auth.permission('user.delete');

    auth.grant('Employee', 'patient.view');
    auth.grant('Auditor', 'audit.log');
    auth.grant('Supervisor', 'user.delete');

    auth.assignRole('u_sup', 'Supervisor');

    // Supervisor inherits from both branches
    expect(auth.can({ id: 'u_sup' }, 'patient.view')).toBe(true);
    expect(auth.can({ id: 'u_sup' }, 'audit.log')).toBe(true);
    expect(auth.can({ id: 'u_sup' }, 'user.delete')).toBe(true);
  });

  it('should inherit wildcard permissions (Employee -> patient.*)', () => {
    auth.role('Employee');
    auth.role('Admin').inherits('Employee');

    auth.permission('patient.*');
    auth.grant('Employee', 'patient.*');

    auth.assignRole('u_admin', 'Admin');

    // Admin inherits wildcard expansions
    expect(auth.can({ id: 'u_admin' }, 'patient.view')).toBe(true);
    expect(auth.can({ id: 'u_admin' }, 'patient.delete')).toBe(true);
    expect(auth.can({ id: 'u_admin' }, 'user.delete')).toBe(false);
  });

  it('should prevent circular inheritance chains (Admin -> Manager -> Employee -> Admin)', () => {
    auth.role('Employee');
    auth.role('Manager').inherits('Employee');
    auth.role('Admin').inherits('Manager');

    // Creating Employee -> Admin closes the loop (Employee -> Admin -> Manager -> Employee)
    expect(() => auth.role('Employee').inherits('Admin')).toThrow(CircularRoleInheritanceError);
  });

  it('should prevent direct self circular inheritance (Employee -> Employee)', () => {
    auth.role('Employee');
    expect(() => auth.role('Employee').inherits('Employee')).toThrow(CircularRoleInheritanceError);
  });

  it('should throw InheritanceRoleNotFoundError when inheriting from an unregistered parent', () => {
    auth.role('Manager');
    expect(() => auth.role('Manager').inherits('Unknown')).toThrow(InheritanceRoleNotFoundError);
  });

  it('should correctly invalidate resolution caches when new inheritance relationships are defined', () => {
    auth.role('Employee');
    auth.role('Manager');

    auth.permission('patient.view');
    auth.grant('Employee', 'patient.view');

    auth.assignRole('u_mgr', 'Manager');

    // Initially Manager does not inherit Employee permissions
    expect(auth.can({ id: 'u_mgr' }, 'patient.view')).toBe(false);

    // Dynamic inheritance is established (invalidates caches)
    auth.role('Manager').inherits('Employee');

    // Now Manager gets inherited access instantly
    expect(auth.can({ id: 'u_mgr' }, 'patient.view')).toBe(true);
  });

  it('should support concluding the builder chain using done()', () => {
    const builder = auth.role('Employee');
    const returnedAuth = builder.done();
    expect(returnedAuth).toBe(auth);
  });
});
