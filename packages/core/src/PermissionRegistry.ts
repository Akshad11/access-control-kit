import { Permission } from './types.js';
import { validatePermission } from './Validation.js';
import { PermissionAlreadyExistsError } from './errors.js';

/**
 * PermissionRegistry manages the lifecycle and unique constraints of registered permissions.
 */
export class PermissionRegistry {
  private readonly permissions = new Set<Permission>();

  /**
   * Registers a new permission in the system.
   *
   * @param permission The unique permission string to register
   * @returns The registered permission string
   * @throws InvalidPermissionError if format is empty, whitespace, or invalid pattern
   * @throws PermissionAlreadyExistsError if permission is already registered
   */
  public register(permission: Permission): Permission {
    validatePermission(permission);

    if (this.permissions.has(permission)) {
      throw new PermissionAlreadyExistsError(permission);
    }

    this.permissions.add(permission);
    return permission;
  }

  /**
   * Checks if a permission is registered in the system.
   *
   * @param permission The permission to check
   */
  public has(permission: Permission): boolean {
    return this.permissions.has(permission);
  }

  /**
   * Returns all registered permissions.
   */
  public getAll(): Permission[] {
    return Array.from(this.permissions);
  }

  /**
   * Clears all registered permissions.
   */
  public clear(): void {
    this.permissions.clear();
  }
}
