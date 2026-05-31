import { AccessControl } from './AccessControl.js';
import { RoleRegistry } from './RoleRegistry.js';
import { PermissionResolver } from './PermissionResolver.js';

/**
 * RoleBuilder provides a fluent builder API to support chaining of inherits() relations.
 */
export class RoleBuilder {
  constructor(
    private readonly roleName: string,
    private readonly roleRegistry: RoleRegistry,
    private readonly permissionResolver: PermissionResolver,
    private readonly accessControl: AccessControl,
  ) {}

  /**
   * Defines that the current role inherits from a parent role.
   *
   * @param parentName The parent role to inherit from
   * @returns The current RoleBuilder instance for fluent chaining
   * @throws InheritanceRoleNotFoundError if parent role doesn't exist
   * @throws CircularRoleInheritanceError if cycle is formed
   */
  public inherits(parentName: string): RoleBuilder {
    // Register the edge in RoleRegistry
    this.roleRegistry.addInheritance(this.roleName, parentName);

    // Invalidate the cache of PermissionResolver
    this.permissionResolver.invalidateCache();

    return this;
  }

  /**
   * Concludes the builder chaining sequence and returns back the main AccessControl manager.
   */
  public done(): AccessControl {
    return this.accessControl;
  }
}
