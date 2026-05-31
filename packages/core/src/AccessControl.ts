import { User, Permission, UserOverrides } from './types.js';
import { RoleRegistry } from './RoleRegistry.js';
import { PermissionRegistry } from './PermissionRegistry.js';
import { UserRoleStore } from './UserRoleStore.js';
import { WildcardMatcher } from './WildcardMatcher.js';
import { PermissionResolver } from './PermissionResolver.js';
import { RoleBuilder } from './RoleBuilder.js';
import { UserOverrideStore } from './UserOverrideStore.js';

/**
 * AccessControl is the main coordinator class for Access Control Kit.
 * It exposes public APIs for RBAC, Role Inheritance, and User Overrides.
 */
export class AccessControl {
  private readonly roleRegistry = new RoleRegistry();
  private readonly permissionRegistry = new PermissionRegistry();
  private readonly userRoleStore = new UserRoleStore(this.roleRegistry);
  private readonly wildcardMatcher = new WildcardMatcher();
  private readonly userOverrideStore = new UserOverrideStore(this.permissionRegistry);
  private readonly permissionResolver = new PermissionResolver(
    this.roleRegistry,
    this.permissionRegistry,
    this.userRoleStore,
    this.wildcardMatcher,
    this.userOverrideStore,
  );

  /**
   * Registers a new role in the system.
   *
   * @param name The unique name of the role
   * @returns A RoleBuilder instance to support fluent method chaining
   * @throws InvalidRoleError if validation fails
   * @throws RoleAlreadyExistsError if role exists
   */
  public role(name: string): RoleBuilder {
    if (!this.roleRegistry.has(name)) {
      this.roleRegistry.register(name);
    }
    return new RoleBuilder(name, this.roleRegistry, this.permissionResolver, this);
  }

  /**
   * Registers a new permission in the system.
   *
   * @param permission The unique permission string
   * @returns The registered permission string
   * @throws InvalidPermissionError if validation fails
   * @throws PermissionAlreadyExistsError if permission exists
   */
  public permission(permission: Permission): Permission {
    return this.permissionRegistry.register(permission);
  }

  /**
   * Grants a permission to a role.
   * Both role and permission must be registered beforehand.
   *
   * @param roleName The name of the role
   * @param permission The permission string to grant
   * @throws RoleNotFoundError if role does not exist
   * @throws PermissionNotFoundError if permission does not exist
   */
  public grant(roleName: string, permission: Permission): void {
    this.permissionResolver.grant(roleName, permission);
    // Purge permission resolution cache as a new grant affects all evaluations
    this.permissionResolver.invalidateCache();
  }

  /**
   * Assigns a role to a user.
   * The role must exist beforehand.
   *
   * @param userId The ID of the user
   * @param roleName The name of the role to assign
   * @throws RoleNotFoundError if role does not exist
   */
  public assignRole(userId: string, roleName: string): void {
    this.userRoleStore.assignRole(userId, roleName);
    this.permissionResolver.invalidateUserCache(userId);
  }

  /**
   * Removes an assigned role from a user.
   * The role must exist beforehand.
   *
   * @param userId The ID of the user
   * @param roleName The name of the role to remove
   * @throws RoleNotFoundError if role does not exist
   */
  public removeRole(userId: string, roleName: string): void {
    this.userRoleStore.removeRole(userId, roleName);
    this.permissionResolver.invalidateUserCache(userId);
  }

  /**
   * Retrieves all roles assigned to a user.
   *
   * @param userId The ID of the user
   * @returns An array of role names assigned to the user
   */
  public getRoles(userId: string): string[] {
    return this.userRoleStore.getRoles(userId);
  }

  /**
   * Registers a user-specific permission allow override.
   *
   * @param userId The ID of the user
   * @param permission The permission to allow
   * @throws PermissionNotFoundError if the permission is not registered
   */
  public allowUser(userId: string, permission: string): void {
    this.userOverrideStore.allowUser(userId, permission);
    this.permissionResolver.invalidateUserCache(userId);
  }

  /**
   * Registers a user-specific permission deny override.
   *
   * @param userId The ID of the user
   * @param permission The permission to deny
   * @throws PermissionNotFoundError if the permission is not registered
   */
  public denyUser(userId: string, permission: string): void {
    this.userOverrideStore.denyUser(userId, permission);
    this.permissionResolver.invalidateUserCache(userId);
  }

  /**
   * Removes a user-specific permission allow override.
   *
   * @param userId The ID of the user
   * @param permission The permission override to remove
   * @throws UserOverrideNotFoundError if the allow override does not exist
   */
  public removeUserAllow(userId: string, permission: string): void {
    this.userOverrideStore.removeUserAllow(userId, permission);
    this.permissionResolver.invalidateUserCache(userId);
  }

  /**
   * Removes a user-specific permission deny override.
   *
   * @param userId The ID of the user
   * @param permission The permission override to remove
   * @throws UserOverrideNotFoundError if the deny override does not exist
   */
  public removeUserDeny(userId: string, permission: string): void {
    this.userOverrideStore.removeUserDeny(userId, permission);
    this.permissionResolver.invalidateUserCache(userId);
  }

  /**
   * Retrieves all custom overrides registered for a user.
   *
   * @param userId The ID of the user
   * @returns UserOverrides structure mapping allowed and denied arrays
   */
  public getUserOverrides(userId: string): UserOverrides {
    return this.userOverrideStore.getUserOverrides(userId);
  }

  /**
   * Performs an authorization check. Evaluates user-specific overrides,
   * direct roles, inherited roles, and wildcard extensions.
   *
   * @param user The user object containing an ID
   * @param permission The target permission string to verify
   * @returns true if user is authorized, false otherwise
   */
  public can(user: User, permission: Permission): boolean {
    if (!user || typeof user.id !== 'string') {
      return false;
    }
    return this.permissionResolver.can(user.id, permission, user.roles);
  }

  /**
   * Retrieves all permissions currently granted to a role.
   *
   * @param roleName The name of the role
   */
  public getGrants(roleName: string): Permission[] {
    return this.permissionResolver.getGrants(roleName);
  }

  /**
   * Resets all internal stores, registries, and caches.
   */
  public clear(): void {
    this.roleRegistry.clear();
    this.permissionRegistry.clear();
    this.userRoleStore.clear();
    this.userOverrideStore.clear();
    this.permissionResolver.clear();
  }
}
