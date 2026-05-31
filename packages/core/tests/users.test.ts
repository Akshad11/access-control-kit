import { describe, it, expect, beforeEach } from 'vitest';
import { RoleRegistry } from '../src/RoleRegistry';
import { UserRoleStore } from '../src/UserRoleStore';
import { RoleNotFoundError } from '../src/errors';

describe('UserRoleStore', () => {
  let roleRegistry: RoleRegistry;
  let userStore: UserRoleStore;

  beforeEach(() => {
    roleRegistry = new RoleRegistry();
    userStore = new UserRoleStore(roleRegistry);
  });

  it('should successfully assign a role to a user', () => {
    roleRegistry.register('Admin');
    userStore.assignRole('user1', 'Admin');
    expect(userStore.getRoles('user1')).toContain('Admin');
  });

  it('should throw RoleNotFoundError when assigning a non-existent role', () => {
    expect(() => userStore.assignRole('user1', 'Visitor')).toThrow(RoleNotFoundError);
    try {
      userStore.assignRole('user1', 'Visitor');
    } catch (e: any) {
      expect(e.name).toBe('RoleNotFoundError');
      expect(e.message).toBe('Role "Visitor" was not found.');
    }
  });

  it('should support multiple roles for a single user', () => {
    roleRegistry.register('Admin');
    roleRegistry.register('Manager');
    userStore.assignRole('user1', 'Admin');
    userStore.assignRole('user1', 'Manager');

    const roles = userStore.getRoles('user1');
    expect(roles).toHaveLength(2);
    expect(roles).toContain('Admin');
    expect(roles).toContain('Manager');
  });

  it('should return empty roles array if user has no assigned roles', () => {
    expect(userStore.getRoles('visitor')).toHaveLength(0);
  });

  it('should successfully remove an assigned role', () => {
    roleRegistry.register('Admin');
    userStore.assignRole('user1', 'Admin');
    userStore.removeRole('user1', 'Admin');
    expect(userStore.getRoles('user1')).not.toContain('Admin');
  });

  it('should throw RoleNotFoundError when removing a non-existent role', () => {
    expect(() => userStore.removeRole('user1', 'Visitor')).toThrow(RoleNotFoundError);
    try {
      userStore.removeRole('user1', 'Visitor');
    } catch (e: any) {
      expect(e.name).toBe('RoleNotFoundError');
    }
  });

  it('should do nothing when trying to remove a role the user does not have', () => {
    roleRegistry.register('Admin');
    userStore.removeRole('user1', 'Admin');
    expect(userStore.getRoles('user1')).toHaveLength(0);
  });

  it('should successfully clear all user role assignments', () => {
    roleRegistry.register('Admin');
    userStore.assignRole('user1', 'Admin');
    userStore.clear();
    expect(userStore.getRoles('user1')).toHaveLength(0);
  });
});
