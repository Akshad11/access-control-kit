import { describe, it, expect, beforeEach } from 'vitest';
import { PermissionRegistry } from '../src/PermissionRegistry';
import { PermissionAlreadyExistsError, InvalidPermissionError } from '../src/errors';

describe('PermissionRegistry', () => {
  let registry: PermissionRegistry;

  beforeEach(() => {
    registry = new PermissionRegistry();
  });

  it('should successfully register valid permissions', () => {
    const valid = ['user.create', 'patient.view', 'invoice.delete', '*', 'patient.*'];
    for (const p of valid) {
      expect(registry.register(p)).toBe(p);
      expect(registry.has(p)).toBe(true);
    }
  });

  it('should throw PermissionAlreadyExistsError on duplicate registration', () => {
    registry.register('user.create');
    expect(() => registry.register('user.create')).toThrow(PermissionAlreadyExistsError);
    try {
      registry.register('user.create');
    } catch (e: any) {
      expect(e.name).toBe('PermissionAlreadyExistsError');
      expect(e.message).toBe('Permission "user.create" already exists.');
    }
  });

  it('should throw InvalidPermissionError for invalid permission formats', () => {
    const invalid = ['', ' ', '.', 'user.', '.create', '***'];
    for (const p of invalid) {
      expect(() => registry.register(p)).toThrow(InvalidPermissionError);
      try {
        registry.register(p);
      } catch (e: any) {
        expect(e.name).toBe('InvalidPermissionError');
      }
    }
  });

  it('should throw InvalidPermissionError for non-string types', () => {
    expect(() => registry.register(123 as any)).toThrow(InvalidPermissionError);
  });

  it('should list all registered permissions', () => {
    registry.register('user.create');
    registry.register('user.delete');
    const all = registry.getAll();
    expect(all).toHaveLength(2);
    expect(all).toContain('user.create');
    expect(all).toContain('user.delete');
  });

  it('should successfully clear all registered permissions', () => {
    registry.register('user.create');
    registry.clear();
    expect(registry.getAll()).toHaveLength(0);
  });
});
