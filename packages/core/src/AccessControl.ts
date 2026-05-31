import { User, Permission, UserOverrides, TemporaryPermission, GrantTemporaryOptions, Tenant, TenantContext } from './types.js';
import { RoleRegistry } from './RoleRegistry.js';
import { PermissionRegistry } from './PermissionRegistry.js';
import { UserRoleStore } from './UserRoleStore.js';
import { WildcardMatcher } from './WildcardMatcher.js';
import { PermissionResolver } from './PermissionResolver.js';
import { RoleBuilder } from './RoleBuilder.js';
import { UserOverrideStore } from './UserOverrideStore.js';
import { TemporaryPermissionStore } from './TemporaryPermissionStore.js';
import {
  TenantAlreadyExistsError,
  TenantNotFoundError,
  TenantContextRequiredError,
} from './errors.js';

/**
 * AccessControl is the main coordinator class for Access Control Kit.
 * It exposes public APIs for RBAC, Role Inheritance, User Overrides, Temporary Permissions, and Multi-Tenant scoping.
 */
export class AccessControl {
  private readonly roleRegistry = new RoleRegistry();
  private readonly permissionRegistry = new PermissionRegistry();
  private readonly userRoleStore = new UserRoleStore(this.roleRegistry);
  private readonly wildcardMatcher = new WildcardMatcher();
  private readonly userOverrideStore = new UserOverrideStore(this.permissionRegistry);
  private readonly temporaryPermissionStore = new TemporaryPermissionStore(this.permissionRegistry);
  private readonly tenants = new Map<string, Tenant>();
  private readonly permissionResolver: PermissionResolver;

  constructor(options?: { autoCleanupExpiredPermissions?: boolean }) {
    this.permissionResolver = new PermissionResolver(
      this.roleRegistry,
      this.permissionRegistry,
      this.userRoleStore,
      this.wildcardMatcher,
      this.userOverrideStore,
      this.temporaryPermissionStore,
      options,
    );
  }

  /**
   * Registers an organization or tenant in the system.
   *
   * @param id The unique ID of the tenant
   * @param name The human-readable name of the tenant
   * @throws TenantAlreadyExistsError if the tenant is already registered
   */
  public tenant(id: string, name?: string): void {
    if (typeof id !== 'string' || id.trim() === '') {
      throw new TenantContextRequiredError('Tenant ID must be a non-empty string.');
    }
    if (this.tenants.has(id)) {
      throw new TenantAlreadyExistsError(id);
    }
    this.tenants.set(id, { id, name });
  }

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
   * Assigns a role to a user within a tenant context.
   * The role must exist beforehand.
   *
   * @param userId The ID of the user
   * @param roleName The name of the role to assign
   * @param tenantId The ID of the tenant context
   * @throws RoleNotFoundError if role does not exist
   * @throws TenantContextRequiredError if tenant context is missing when multi-tenant mode is enabled
   * @throws TenantNotFoundError if the tenant is unregistered
   */
  public assignRole(userId: string, roleName: string, tenantId?: string): void {
    const activeTenantId = this.resolveTenantId(tenantId);
    this.userRoleStore.assignRole(userId, roleName, activeTenantId);
    this.permissionResolver.invalidateUserTenantCache(userId, activeTenantId);
  }

  /**
   * Removes an assigned role from a user within a tenant context.
   * The role must exist beforehand.
   *
   * @param userId The ID of the user
   * @param roleName The name of the role to remove
   * @param tenantId The ID of the tenant context
   * @throws RoleNotFoundError if role does not exist
   * @throws TenantContextRequiredError if tenant context is missing when multi-tenant mode is enabled
   * @throws TenantNotFoundError if the tenant is unregistered
   */
  public removeRole(userId: string, roleName: string, tenantId?: string): void {
    const activeTenantId = this.resolveTenantId(tenantId);
    this.userRoleStore.removeRole(userId, roleName, activeTenantId);
    this.permissionResolver.invalidateUserTenantCache(userId, activeTenantId);
  }

  /**
   * Retrieves all roles assigned to a user within a tenant context.
   *
   * @param userId The ID of the user
   * @param tenantId The ID of the tenant context
   * @returns An array of role names assigned to the user
   * @throws TenantContextRequiredError if tenant context is missing when multi-tenant mode is enabled
   * @throws TenantNotFoundError if the tenant is unregistered
   */
  public getRoles(userId: string, tenantId?: string): string[] {
    const activeTenantId = this.resolveTenantId(tenantId);
    return this.userRoleStore.getRoles(userId, activeTenantId);
  }

  /**
   * Registers a user-specific permission allow override within a tenant context.
   *
   * @param userId The ID of the user
   * @param permission The permission to allow
   * @param tenantId The ID of the tenant context
   * @throws PermissionNotFoundError if the permission is not registered
   * @throws TenantContextRequiredError if tenant context is missing when multi-tenant mode is enabled
   * @throws TenantNotFoundError if the tenant is unregistered
   */
  public allowUser(userId: string, permission: string, tenantId?: string): void {
    const activeTenantId = this.resolveTenantId(tenantId);
    this.userOverrideStore.allowUser(userId, permission, activeTenantId);
    this.permissionResolver.invalidateUserTenantCache(userId, activeTenantId);
  }

  /**
   * Registers a user-specific permission deny override within a tenant context.
   *
   * @param userId The ID of the user
   * @param permission The permission to deny
   * @param tenantId The ID of the tenant context
   * @throws PermissionNotFoundError if the permission is not registered
   * @throws TenantContextRequiredError if tenant context is missing when multi-tenant mode is enabled
   * @throws TenantNotFoundError if the tenant is unregistered
   */
  public denyUser(userId: string, permission: string, tenantId?: string): void {
    const activeTenantId = this.resolveTenantId(tenantId);
    this.userOverrideStore.denyUser(userId, permission, activeTenantId);
    this.permissionResolver.invalidateUserTenantCache(userId, activeTenantId);
  }

  /**
   * Removes a user-specific permission allow override within a tenant context.
   *
   * @param userId The ID of the user
   * @param permission The permission override to remove
   * @param tenantId The ID of the tenant context
   * @throws UserOverrideNotFoundError if the allow override does not exist
   * @throws TenantContextRequiredError if tenant context is missing when multi-tenant mode is enabled
   * @throws TenantNotFoundError if the tenant is unregistered
   */
  public removeUserAllow(userId: string, permission: string, tenantId?: string): void {
    const activeTenantId = this.resolveTenantId(tenantId);
    this.userOverrideStore.removeUserAllow(userId, permission, activeTenantId);
    this.permissionResolver.invalidateUserTenantCache(userId, activeTenantId);
  }

  /**
   * Removes a user-specific permission deny override within a tenant context.
   *
   * @param userId The ID of the user
   * @param permission The permission override to remove
   * @param tenantId The ID of the tenant context
   * @throws UserOverrideNotFoundError if the deny override does not exist
   * @throws TenantContextRequiredError if tenant context is missing when multi-tenant mode is enabled
   * @throws TenantNotFoundError if the tenant is unregistered
   */
  public removeUserDeny(userId: string, permission: string, tenantId?: string): void {
    const activeTenantId = this.resolveTenantId(tenantId);
    this.userOverrideStore.removeUserDeny(userId, permission, activeTenantId);
    this.permissionResolver.invalidateUserTenantCache(userId, activeTenantId);
  }

  /**
   * Retrieves all custom overrides registered for a user within a tenant context.
   *
   * @param userId The ID of the user
   * @param tenantId The ID of the tenant context
   * @returns UserOverrides structure mapping allowed and denied arrays
   * @throws TenantContextRequiredError if tenant context is missing when multi-tenant mode is enabled
   * @throws TenantNotFoundError if the tenant is unregistered
   */
  public getUserOverrides(userId: string, tenantId?: string): UserOverrides {
    const activeTenantId = this.resolveTenantId(tenantId);
    return this.userOverrideStore.getUserOverrides(userId, activeTenantId);
  }

  /**
   * Grants a temporary permission to a user within a tenant context.
   *
   * @param options Details of the temporary grant
   * @throws PermissionNotFoundError if the permission is not registered
   * @throws InvalidExpirationDateError if the expiration date is invalid or in the past
   * @throws TenantContextRequiredError if tenant context is missing when multi-tenant mode is enabled
   * @throws TenantNotFoundError if the tenant is unregistered
   */
  public grantTemporary(options: GrantTemporaryOptions): void {
    const activeTenantId = this.resolveTenantId(options.tenantId);
    this.temporaryPermissionStore.grantTemporary({ ...options, tenantId: activeTenantId });
    this.permissionResolver.invalidateUserTenantCache(options.userId, activeTenantId);
  }

  /**
   * Revokes a temporary permission from a user within a tenant context.
   *
   * @param userId The ID of the user
   * @param permission The permission to revoke
   * @param tenantId The ID of the tenant context
   * @throws TemporaryPermissionNotFoundError if the temporary permission does not exist
   * @throws TenantContextRequiredError if tenant context is missing when multi-tenant mode is enabled
   * @throws TenantNotFoundError if the tenant is unregistered
   */
  public revokeTemporary(userId: string, permission: string, tenantId?: string): void {
    const activeTenantId = this.resolveTenantId(tenantId);
    this.temporaryPermissionStore.revokeTemporary(userId, permission, activeTenantId);
    this.permissionResolver.invalidateUserTenantCache(userId, activeTenantId);
  }

  /**
   * Retrieves all temporary permissions registered for a user within a tenant context.
   *
   * @param userId The ID of the user
   * @param tenantId The ID of the tenant context
   * @returns An array of temporary permissions
   * @throws TenantContextRequiredError if tenant context is missing when multi-tenant mode is enabled
   * @throws TenantNotFoundError if the tenant is unregistered
   */
  public getTemporaryPermissions(userId: string, tenantId?: string): TemporaryPermission[] {
    const activeTenantId = this.resolveTenantId(tenantId);
    return this.temporaryPermissionStore.getTemporaryPermissions(userId, activeTenantId);
  }

  /**
   * Scans and removes all expired temporary permission records and invalidates caches.
   */
  public cleanupExpiredPermissions(): void {
    const cleaned = this.temporaryPermissionStore.cleanupExpiredPermissions();
    for (const item of cleaned) {
      this.permissionResolver.invalidateUserTenantCache(item.userId, item.tenantId);
    }
  }

  /**
   * Performs an authorization check. Evaluates user-specific overrides,
   * direct roles, inherited roles, and wildcard extensions within the resolved tenant context.
   *
   * @param user The user object containing an ID
   * @param permission The target permission string to verify
   * @param context Scope coordinates for multi-tenant check
   * @returns true if user is authorized, false otherwise
   * @throws TenantContextRequiredError if tenant context is missing when multi-tenant mode is enabled
   * @throws TenantNotFoundError if the tenant context maps to an unregistered tenant
   */
  public can(user: User, permission: Permission, context?: TenantContext): boolean {
    if (!user || typeof user.id !== 'string') {
      return false;
    }

    const isMultiTenant = this.tenants.size > 0;
    if (isMultiTenant) {
      if (!context || !context.tenantId || typeof context.tenantId !== 'string' || context.tenantId.trim() === '') {
        throw new TenantContextRequiredError();
      }
      if (!this.tenants.has(context.tenantId)) {
        throw new TenantNotFoundError(context.tenantId);
      }
      return this.permissionResolver.can(user.id, permission, user.roles, context.tenantId);
    }

    // Default to __default__ single tenant operation
    return this.permissionResolver.can(user.id, permission, user.roles, '__default__');
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
    this.temporaryPermissionStore.clear();
    this.tenants.clear();
    this.permissionResolver.clear();
  }

  /**
   * Helper to resolve the correct tenant ID mapping context.
   */
  private resolveTenantId(tenantId?: string): string {
    const isMultiTenant = this.tenants.size > 0;
    if (isMultiTenant) {
      if (!tenantId || typeof tenantId !== 'string' || tenantId.trim() === '') {
        throw new TenantContextRequiredError();
      }
      if (!this.tenants.has(tenantId)) {
        throw new TenantNotFoundError(tenantId);
      }
      return tenantId;
    }
    return '__default__';
  }
}
