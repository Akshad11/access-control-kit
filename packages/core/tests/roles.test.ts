import { describe, it, expect, beforeEach } from 'vitest';
import { RoleRegistry } from '../src/RoleRegistry';
import { RoleAlreadyExistsError, InvalidRoleError } from '../src/errors';

describe('RoleRegistry', () => {
  let registry: RoleRegistry;

  beforeEach(() => {
    registry = new RoleRegistry();
  });

  it('should successfully register a valid role', () => {
    const role = registry.register('Admin');
    expect(role.name).toBe('Admin');
    expect(registry.has('Admin')).toBe(true);
    expect(registry.get('Admin')).toEqual(role);
  });

  it('should throw RoleAlreadyExistsError on duplicate registration', () => {
    registry.register('Manager');
    expect(() => registry.register('Manager')).toThrow(RoleAlreadyExistsError);
    try {
      registry.register('Manager');
    } catch (e: any) {
      expect(e.name).toBe('RoleAlreadyExistsError');
      expect(e.message).toBe('Role "Manager" already exists.');
    }
  });

  it('should throw InvalidRoleError for empty names', () => {
    expect(() => registry.register('')).toThrow(InvalidRoleError);
    try {
      registry.register('');
    } catch (e: any) {
      expect(e.name).toBe('InvalidRoleError');
    }
  });

  it('should throw InvalidRoleError for non-string types', () => {
    expect(() => registry.register(123 as any)).toThrow(InvalidRoleError);
  });

  it('should throw InvalidRoleError for whitespace-only names', () => {
    expect(() => registry.register('   ')).toThrow(InvalidRoleError);
  });

  it('should list all registered roles', () => {
    registry.register('Admin');
    registry.register('Employee');
    const roles = registry.getAll();
    expect(roles).toHaveLength(2);
    expect(roles.map((r) => r.name)).toContain('Admin');
    expect(roles.map((r) => r.name)).toContain('Employee');
  });

  it('should successfully clear all registered roles', () => {
    registry.register('Admin');
    registry.clear();
    expect(registry.getAll()).toHaveLength(0);
  });
});
