import { RoleRegistry } from './RoleRegistry.js';
import { RoleNotFoundError } from './errors.js';

/**
 * UserRoleStore manages the assignment and mapping of roles to users per tenant.
 */
export class UserRoleStore {
  // Structure: Map<userId, Map<tenantId, Set<roleName>>>
  private readonly userRoles = new Map<string, Map<string, Set<string>>>();

  constructor(private readonly roleRegistry: RoleRegistry) {}

  /**
   * Assigns a role to a user within a specific tenant.
   *
   * @param userId The ID of the user
   * @param roleName The name of the role to assign
   * @param tenantId The ID of the tenant scope
   * @throws RoleNotFoundError if the role does not exist in the system
   */
  public assignRole(userId: string, roleName: string, tenantId: string): void {
    if (!this.roleRegistry.has(roleName)) {
      throw new RoleNotFoundError(roleName);
    }

    let tenantMap = this.userRoles.get(userId);
    if (!tenantMap) {
      tenantMap = new Map<string, Set<string>>();
      this.userRoles.set(userId, tenantMap);
    }

    let roles = tenantMap.get(tenantId);
    if (!roles) {
      roles = new Set<string>();
      tenantMap.set(tenantId, roles);
    }
    roles.add(roleName);
  }

  /**
   * Removes a role from a user within a specific tenant.
   *
   * @param userId The ID of the user
   * @param roleName The name of the role to remove
   * @param tenantId The ID of the tenant scope
   * @throws RoleNotFoundError if the role does not exist in the system
   */
  public removeRole(userId: string, roleName: string, tenantId: string): void {
    if (!this.roleRegistry.has(roleName)) {
      throw new RoleNotFoundError(roleName);
    }

    const tenantMap = this.userRoles.get(userId);
    if (tenantMap) {
      const roles = tenantMap.get(tenantId);
      if (roles) {
        roles.delete(roleName);
        if (roles.size === 0) {
          tenantMap.delete(tenantId);
        }
      }
      if (tenantMap.size === 0) {
        this.userRoles.delete(userId);
      }
    }
  }

  /**
   * Gets all roles assigned to a user within a specific tenant.
   *
   * @param userId The ID of the user
   * @param tenantId The ID of the tenant scope
   * @returns An array of role names assigned to the user
   */
  public getRoles(userId: string, tenantId: string): string[] {
    const tenantMap = this.userRoles.get(userId);
    if (!tenantMap) {
      return [];
    }
    const roles = tenantMap.get(tenantId);
    return roles ? Array.from(roles) : [];
  }

  /**
   * Clears all user role assignments.
   */
  public clear(): void {
    this.userRoles.clear();
  }
}
