import { Role } from './types.js';
import { validateRoleName } from './Validation.js';
import { RoleAlreadyExistsError } from './errors.js';

/**
 * RoleRegistry manages the lifecycle of unique roles within the Access Control Kit.
 */
export class RoleRegistry {
  private readonly roles = new Map<string, Role>();

  /**
   * Registers a new role in the system.
   *
   * @param name The unique name of the role to create
   * @returns The created Role object
   * @throws InvalidRoleError if the role name is empty/whitespace or invalid type
   * @throws RoleAlreadyExistsError if a role with the given name already exists
   */
  public register(name: string): Role {
    validateRoleName(name);

    if (this.roles.has(name)) {
      throw new RoleAlreadyExistsError(name);
    }

    const role: Role = { name };
    this.roles.set(name, role);
    return role;
  }

  /**
   * Checks if a role exists in the registry.
   *
   * @param name The name of the role to check
   */
  public has(name: string): boolean {
    return this.roles.has(name);
  }

  /**
   * Retrieves a registered role by its name.
   *
   * @param name The name of the role to retrieve
   * @returns The Role object if found, or undefined
   */
  public get(name: string): Role | undefined {
    return this.roles.get(name);
  }

  /**
   * Returns all registered roles.
   */
  public getAll(): Role[] {
    return Array.from(this.roles.values());
  }

  /**
   * Clears all registered roles.
   */
  public clear(): void {
    this.roles.clear();
  }
}
