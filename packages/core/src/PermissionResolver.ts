import { RoleRegistry } from './RoleRegistry.js';
import { PermissionRegistry } from './PermissionRegistry.js';
import { UserRoleStore } from './UserRoleStore.js';
import { WildcardMatcher } from './WildcardMatcher.js';
import { RoleNotFoundError, PermissionNotFoundError } from './errors.js';

/**
 * PermissionResolver manages the assignment of permissions to roles and resolves
 * user access checks. It implements high-performance checks optimized to O(number_of_user_roles).
 */
export class PermissionResolver {
  // Main mapping of roles to all granted permissions as requested by internal data structures.
  private readonly grants = new Map<string, Set<string>>();

  // Segregated structures to achieve O(number_of_user_roles) check performance.
  private readonly exactGrants = new Map<string, Set<string>>();
  private readonly wildcardGrants = new Map<string, Set<string>>();

  constructor(
    private readonly roleRegistry: RoleRegistry,
    private readonly permissionRegistry: PermissionRegistry,
    private readonly userRoleStore: UserRoleStore,
    private readonly wildcardMatcher: WildcardMatcher,
  ) {}

  /**
   * Grants a permission to a role.
   *
   * @param roleName The name of the role
   * @param permission The permission string to grant
   * @throws RoleNotFoundError if the role does not exist
   * @throws PermissionNotFoundError if the permission does not exist
   */
  public grant(roleName: string, permission: string): void {
    if (!this.roleRegistry.has(roleName)) {
      throw new RoleNotFoundError(roleName);
    }
    if (!this.permissionRegistry.has(permission)) {
      throw new PermissionNotFoundError(permission);
    }

    // Store in the primary grants registry
    let roleGrants = this.grants.get(roleName);
    if (!roleGrants) {
      roleGrants = new Set<string>();
      this.grants.set(roleName, roleGrants);
    }
    roleGrants.add(permission);

    // Segregate into exact and wildcard permissions to optimize lookup performance
    if (permission.includes('*')) {
      let wildcards = this.wildcardGrants.get(roleName);
      if (!wildcards) {
        wildcards = new Set<string>();
        this.wildcardGrants.set(roleName, wildcards);
      }
      wildcards.add(permission);
    } else {
      let exacts = this.exactGrants.get(roleName);
      if (!exacts) {
        exacts = new Set<string>();
        this.exactGrants.set(roleName, exacts);
      }
      exacts.add(permission);
    }
  }

  /**
   * Checks whether a user has a specific permission.
   * Runs in O(number_of_user_roles) check complexity by utilizing segregated exact and wildcard checks.
   *
   * @param userId The ID of the user
   * @param permission The target permission string to check
   * @returns true if the user has access, false otherwise
   */
  public can(userId: string, permission: string, passedRoles?: string[]): boolean {
    const roles = passedRoles || this.userRoleStore.getRoles(userId);
    if (roles.length === 0) {
      return false;
    }

    for (const role of roles) {
      // 1. Fast O(1) exact match check
      const exacts = this.exactGrants.get(role);
      if (exacts && exacts.has(permission)) {
        return true;
      }

      // 2. Wildcard matching (usually O(1) as number of wildcards per role is minimal)
      const wildcards = this.wildcardGrants.get(role);
      if (wildcards) {
        for (const wildcard of wildcards) {
          if (this.wildcardMatcher.match(wildcard, permission)) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * Retrieves all permissions granted to a role.
   *
   * @param roleName The name of the role
   */
  public getGrants(roleName: string): string[] {
    const roleGrants = this.grants.get(roleName);
    return roleGrants ? Array.from(roleGrants) : [];
  }

  /**
   * Clears all grants configurations.
   */
  public clear(): void {
    this.grants.clear();
    this.exactGrants.clear();
    this.wildcardGrants.clear();
  }
}
