import { RoleRegistry } from './RoleRegistry.js';
import { RoleNotFoundError } from './errors.js';

/**
 * UserRoleStore manages the assignment and mapping of roles to users.
 */
export class UserRoleStore {
  private readonly userRoles = new Map<string, Set<string>>();

  constructor(private readonly roleRegistry: RoleRegistry) {}

  /**
   * Assigns a role to a user.
   *
   * @param userId The ID of the user
   * @param roleName The name of the role to assign
   * @throws RoleNotFoundError if the role does not exist in the system
   */
  public assignRole(userId: string, roleName: string): void {
    if (!this.roleRegistry.has(roleName)) {
      throw new RoleNotFoundError(roleName);
    }

    let roles = this.userRoles.get(userId);
    if (!roles) {
      roles = new Set<string>();
      this.userRoles.set(userId, roles);
    }
    roles.add(roleName);
  }

  /**
   * Removes a role from a user.
   *
   * @param userId The ID of the user
   * @param roleName The name of the role to remove
   * @throws RoleNotFoundError if the role does not exist in the system
   */
  public removeRole(userId: string, roleName: string): void {
    if (!this.roleRegistry.has(roleName)) {
      throw new RoleNotFoundError(roleName);
    }

    const roles = this.userRoles.get(userId);
    if (roles) {
      roles.delete(roleName);
      if (roles.size === 0) {
        this.userRoles.delete(userId);
      }
    }
  }

  /**
   * Gets all roles assigned to a user.
   *
   * @param userId The ID of the user
   * @returns An array of role names assigned to the user
   */
  public getRoles(userId: string): string[] {
    const roles = this.userRoles.get(userId);
    return roles ? Array.from(roles) : [];
  }

  /**
   * Clears all user role assignments.
   */
  public clear(): void {
    this.userRoles.clear();
  }
}
