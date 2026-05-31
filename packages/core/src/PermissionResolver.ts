import { RoleRegistry } from './RoleRegistry.js';
import { PermissionRegistry } from './PermissionRegistry.js';
import { UserRoleStore } from './UserRoleStore.js';
import { WildcardMatcher } from './WildcardMatcher.js';
import { UserOverrideStore } from './UserOverrideStore.js';
import { RoleNotFoundError, PermissionNotFoundError } from './errors.js';

/**
 * PermissionResolver manages the assignment of permissions to roles and resolves
 * user access checks. It implements high-performance priority-based permission checks
 * with memoized role ancestor and double-nested user permission caches.
 */
export class PermissionResolver {
  // Main mapping of roles to all granted permissions as requested by internal data structures.
  private readonly grants = new Map<string, Set<string>>();

  // Segregated structures to achieve O(number_of_user_roles) check performance.
  private readonly exactGrants = new Map<string, Set<string>>();
  private readonly wildcardGrants = new Map<string, Set<string>>();

  // Memoization cache mapping each role name to its resolved set of all recursive ancestors.
  private readonly ancestorCache = new Map<string, Set<string>>();

  // Double-nested user permission cache mapping userId -> permission -> allowed.
  private readonly userPermissionCache = new Map<string, Map<string, boolean>>();

  constructor(
    private readonly roleRegistry: RoleRegistry,
    private readonly permissionRegistry: PermissionRegistry,
    private readonly userRoleStore: UserRoleStore,
    private readonly wildcardMatcher: WildcardMatcher,
    private readonly userOverrideStore: UserOverrideStore,
  ) {}

  /**
   * Invalidates all ancestor and permission resolution caches.
   */
  public invalidateCache(): void {
    this.ancestorCache.clear();
    this.userPermissionCache.clear();
  }

  /**
   * Invalidates caches for a specific user ID.
   *
   * @param userId The ID of the user to invalidate
   */
  public invalidateUserCache(userId: string): void {
    this.userPermissionCache.delete(userId);
  }

  /**
   * Retrieves all recursive ancestor roles of a role.
   *
   * @param roleName The name of the role
   * @returns Set containing all recursive ancestor role names
   */
  public getAncestors(roleName: string): Set<string> {
    const cached = this.ancestorCache.get(roleName);
    if (cached) {
      return cached;
    }

    const ancestors = new Set<string>();
    const queue: string[] = [];

    const directParents = this.roleRegistry.getParents(roleName);
    for (const parent of directParents) {
      queue.push(parent);
    }

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (!ancestors.has(current)) {
        ancestors.add(current);
        const parentsOfCurrent = this.roleRegistry.getParents(current);
        for (const p of parentsOfCurrent) {
          if (!ancestors.has(p)) {
            queue.push(p);
          }
        }
      }
    }

    this.ancestorCache.set(roleName, ancestors);
    return ancestors;
  }

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

    let roleGrants = this.grants.get(roleName);
    if (!roleGrants) {
      roleGrants = new Set<string>();
      this.grants.set(roleName, roleGrants);
    }
    roleGrants.add(permission);

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
   * Runs in O(1) warm-cache complexity and enforces Priority 1-6 evaluation checks.
   *
   * @param userId The ID of the user
   * @param permission The target permission string to check
   * @param passedRoles Optional array of pre-resolved roles to perform stateless checks
   * @returns true if the user has access, false otherwise
   */
  public can(userId: string, permission: string, passedRoles?: string[]): boolean {
    // 1. Warm Cache Path check
    const userCache = this.userPermissionCache.get(userId);
    if (userCache) {
      const cachedValue = userCache.get(permission);
      if (cachedValue !== undefined) {
        return cachedValue;
      }
    }

    // Helper to store in nested cache and return the evaluated result
    const cacheResult = (result: boolean): boolean => {
      let uCache = this.userPermissionCache.get(userId);
      if (!uCache) {
        uCache = new Map<string, boolean>();
        this.userPermissionCache.set(userId, uCache);
      }
      uCache.set(permission, result);
      return result;
    };

    // --- PRIORITY 1: User Deny Overrides (Exact and Wildcard) ---
    const denySet = this.userOverrideStore.getDenySet(userId);
    if (denySet) {
      if (denySet.has(permission)) {
        return cacheResult(false);
      }
      for (const denyPattern of denySet) {
        if (this.wildcardMatcher.match(denyPattern, permission)) {
          return cacheResult(false);
        }
      }
    }

    // --- PRIORITY 2: User Allow Overrides (Exact and Wildcard) ---
    const allowSet = this.userOverrideStore.getAllowSet(userId);
    if (allowSet) {
      if (allowSet.has(permission)) {
        return cacheResult(true);
      }
      for (const allowPattern of allowSet) {
        if (this.wildcardMatcher.match(allowPattern, permission)) {
          return cacheResult(true);
        }
      }
    }

    // Resolve direct roles
    const directRoles = passedRoles || this.userRoleStore.getRoles(userId);
    if (directRoles.length === 0) {
      return cacheResult(false);
    }

    // Gather all active roles (direct roles and inherited parent roles)
    const activeRoles = new Set<string>();
    for (const role of directRoles) {
      activeRoles.add(role);
      const ancestors = this.getAncestors(role);
      for (const ancestor of ancestors) {
        activeRoles.add(ancestor);
      }
    }

    // --- PRIORITY 3 & 4: Role Exact Permissions (Direct and Inherited) ---
    for (const role of activeRoles) {
      const exacts = this.exactGrants.get(role);
      if (exacts && exacts.has(permission)) {
        return cacheResult(true);
      }
    }

    // --- PRIORITY 5: Wildcard Permissions (Direct and Inherited roles) ---
    for (const role of activeRoles) {
      const wildcards = this.wildcardGrants.get(role);
      if (wildcards) {
        for (const wildcard of wildcards) {
          if (this.wildcardMatcher.match(wildcard, permission)) {
            return cacheResult(true);
          }
        }
      }
    }

    // --- PRIORITY 6: Default Deny ---
    return cacheResult(false);
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
   * Clears all grants configurations and invalidates caches.
   */
  public clear(): void {
    this.grants.clear();
    this.exactGrants.clear();
    this.wildcardGrants.clear();
    this.invalidateCache();
  }
}
