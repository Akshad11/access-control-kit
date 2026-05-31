import { User, Role, Permission } from './types.js';
import { RoleRegistry } from './RoleRegistry.js';
import { PermissionRegistry } from './PermissionRegistry.js';
import { UserRoleStore } from './UserRoleStore.js';
import { WildcardMatcher } from './WildcardMatcher.js';
import { PermissionResolver } from './PermissionResolver.js';

/**
 * AccessControl is the main entry point class for Phase 1 of the Access Control Kit.
 * It coordinates role registries, permission registries, assignment stores, and resolvers.
 */
export class AccessControl {
  private readonly roleRegistry = new RoleRegistry();
  private readonly permissionRegistry = new PermissionRegistry();
  private readonly userRoleStore = new UserRoleStore(this.roleRegistry);
  private readonly wildcardMatcher = new WildcardMatcher();
  private readonly permissionResolver = new PermissionResolver(
    this.roleRegistry,
    this.permissionRegistry,
    this.userRoleStore,
    this.wildcardMatcher,
  );

  /**
   * Registers a new role in the system.
   *
   * @param name The unique name of the role
   * @returns The registered Role object
   * @throws InvalidRoleError if validation fails
   * @throws RoleAlreadyExistsError if role exists
   */
  public role(name: string): Role {
    return this.roleRegistry.register(name);
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
   * Performs an authorization check. Returns true if the user's assigned roles grant
   * the requested permission, directly or via wildcard expansion.
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
    this.permissionResolver.clear();
  }
}
