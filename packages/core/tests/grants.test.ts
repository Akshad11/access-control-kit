import { describe, it, expect, beforeEach } from 'vitest';
import { RoleRegistry } from '../src/RoleRegistry';
import { PermissionRegistry } from '../src/PermissionRegistry';
import { UserRoleStore } from '../src/UserRoleStore';
import { WildcardMatcher } from '../src/WildcardMatcher';
import { PermissionResolver } from '../src/PermissionResolver';
import { RoleNotFoundError, PermissionNotFoundError } from '../src/errors';

describe('PermissionResolver - Grants', () => {
  let roleRegistry: RoleRegistry;
  let permRegistry: PermissionRegistry;
  let userStore: UserRoleStore;
  let matcher: WildcardMatcher;
  let resolver: PermissionResolver;

  beforeEach(() => {
    roleRegistry = new RoleRegistry();
    permRegistry = new PermissionRegistry();
    userStore = new UserRoleStore(roleRegistry);
    matcher = new WildcardMatcher();
    resolver = new PermissionResolver(roleRegistry, permRegistry, userStore, matcher);
  });

  it('should successfully grant a registered permission to a registered role', () => {
    roleRegistry.register('Admin');
    permRegistry.register('user.create');

    resolver.grant('Admin', 'user.create');
    expect(resolver.getGrants('Admin')).toContain('user.create');
  });

  it('should throw RoleNotFoundError when granting to a non-existent role', () => {
    permRegistry.register('user.create');
    expect(() => resolver.grant('Visitor', 'user.create')).toThrow(RoleNotFoundError);
    try {
      resolver.grant('Visitor', 'user.create');
    } catch (e: any) {
      expect(e.name).toBe('RoleNotFoundError');
      expect(e.message).toBe('Role "Visitor" was not found.');
    }
  });

  it('should throw PermissionNotFoundError when granting a non-existent permission', () => {
    roleRegistry.register('Admin');
    expect(() => resolver.grant('Admin', 'user.create')).toThrow(PermissionNotFoundError);
    try {
      resolver.grant('Admin', 'user.create');
    } catch (e: any) {
      expect(e.name).toBe('PermissionNotFoundError');
      expect(e.message).toBe('Permission "user.create" was not found.');
    }
  });

  it('should prevent duplicate grants transparently', () => {
    roleRegistry.register('Admin');
    permRegistry.register('user.create');

    resolver.grant('Admin', 'user.create');
    resolver.grant('Admin', 'user.create'); // Duplicate
    expect(resolver.getGrants('Admin')).toHaveLength(1);
  });

  it('should segregate exact and wildcard permissions correctly', () => {
    roleRegistry.register('Admin');
    permRegistry.register('user.create');
    permRegistry.register('patient.*');

    resolver.grant('Admin', 'user.create');
    resolver.grant('Admin', 'patient.*');

    expect(resolver.getGrants('Admin')).toHaveLength(2);
  });

  it('should return empty array for non-existent or role with no grants', () => {
    expect(resolver.getGrants('Visitor')).toHaveLength(0);
  });

  it('should successfully clear all grants configurations', () => {
    roleRegistry.register('Admin');
    permRegistry.register('user.create');
    resolver.grant('Admin', 'user.create');
    resolver.clear();
    expect(resolver.getGrants('Admin')).toHaveLength(0);
  });
});
