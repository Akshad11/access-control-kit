import { Role } from './types.js';
import { validateRoleName } from './Validation.js';
import {
  RoleAlreadyExistsError,
  CircularRoleInheritanceError,
  InheritanceRoleNotFoundError,
} from './errors.js';

/**
 * RoleRegistry manages the lifecycle of unique roles and their inheritance graph structures
 * within the Access Control Kit.
 */
export class RoleRegistry {
  private readonly roles = new Map<string, Role>();
  private readonly parentsMap = new Map<string, Set<string>>();

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
   * Adds inheritance: roleName inherits from parentName.
   * Runs cycle check beforehand and invalidates caches.
   *
   * @param roleName The child role inheriting
   * @param parentName The parent role being inherited from
   * @throws InheritanceRoleNotFoundError if the parent role is not registered
   * @throws CircularRoleInheritanceError if cycle is detected
   */
  public addInheritance(roleName: string, parentName: string): void {
    if (!this.roles.has(parentName)) {
      throw new InheritanceRoleNotFoundError(parentName);
    }

    // Cycle detection: check if parentName has a path back to roleName
    if (this.hasPath(parentName, roleName)) {
      throw new CircularRoleInheritanceError(roleName, parentName);
    }

    let parents = this.parentsMap.get(roleName);
    if (!parents) {
      parents = new Set<string>();
      this.parentsMap.set(roleName, parents);
    }
    parents.add(parentName);
  }

  /**
   * Retrieves immediate parent role names.
   *
   * @param roleName The name of the role
   */
  public getParents(roleName: string): Set<string> {
    return this.parentsMap.get(roleName) || new Set<string>();
  }

  /**
   * Checks if there exists a directed path from start node to target node.
   * Used for cycle detection.
   */
  public hasPath(start: string, target: string): boolean {
    const visited = new Set<string>();
    const dfs = (curr: string): boolean => {
      if (curr === target) {
        return true;
      }
      visited.add(curr);
      const parents = this.parentsMap.get(curr);
      if (parents) {
        for (const parent of parents) {
          if (!visited.has(parent)) {
            if (dfs(parent)) {
              return true;
            }
          }
        }
      }
      return false;
    };
    return dfs(start);
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
   * Clears all registered roles and parents mapping.
   */
  public clear(): void {
    this.roles.clear();
    this.parentsMap.clear();
  }
}
