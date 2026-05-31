import { PermissionRegistry } from './PermissionRegistry.js';
import { UserOverrideRecord, UserOverrides } from './types.js';
import { PermissionNotFoundError, UserOverrideNotFoundError } from './errors.js';

/**
 * UserOverrideStore manages the in-memory storage, mappings, and validation
 * of user-specific permission overrides per tenant.
 */
export class UserOverrideStore {
  // Structure: Map<userId, Map<tenantId, UserOverrideRecord>>
  private readonly userOverrides = new Map<string, Map<string, UserOverrideRecord>>();

  constructor(private readonly permissionRegistry: PermissionRegistry) {}

  /**
   * Registers a user-specific allow override within a tenant.
   *
   * @param userId The ID of the user
   * @param permission The permission to override
   * @param tenantId The ID of the tenant scope
   * @throws PermissionNotFoundError if the permission is not registered
   */
  public allowUser(userId: string, permission: string, tenantId: string): void {
    if (!this.permissionRegistry.has(permission)) {
      throw new PermissionNotFoundError(permission);
    }

    const record = this.getOrCreateRecord(userId, tenantId);
    record.allow.add(permission);
  }

  /**
   * Registers a user-specific deny override within a tenant.
   *
   * @param userId The ID of the user
   * @param permission The permission to override
   * @param tenantId The ID of the tenant scope
   * @throws PermissionNotFoundError if the permission is not registered
   */
  public denyUser(userId: string, permission: string, tenantId: string): void {
    if (!this.permissionRegistry.has(permission)) {
      throw new PermissionNotFoundError(permission);
    }

    const record = this.getOrCreateRecord(userId, tenantId);
    record.deny.add(permission);
  }

  /**
   * Removes a user-specific allow override within a tenant.
   *
   * @param userId The ID of the user
   * @param permission The permission override to remove
   * @param tenantId The ID of the tenant scope
   * @throws UserOverrideNotFoundError if the allow override does not exist
   */
  public removeUserAllow(userId: string, permission: string, tenantId: string): void {
    const tenantMap = this.userOverrides.get(userId);
    const record = tenantMap?.get(tenantId);
    if (!record || !record.allow.has(permission)) {
      throw new UserOverrideNotFoundError(userId, 'allow', permission);
    }

    record.allow.delete(permission);
    this.cleanIfEmpty(userId, tenantId);
  }

  /**
   * Removes a user-specific deny override within a tenant.
   *
   * @param userId The ID of the user
   * @param permission The permission override to remove
   * @param tenantId The ID of the tenant scope
   * @throws UserOverrideNotFoundError if the deny override does not exist
   */
  public removeUserDeny(userId: string, permission: string, tenantId: string): void {
    const tenantMap = this.userOverrides.get(userId);
    const record = tenantMap?.get(tenantId);
    if (!record || !record.deny.has(permission)) {
      throw new UserOverrideNotFoundError(userId, 'deny', permission);
    }

    record.deny.delete(permission);
    this.cleanIfEmpty(userId, tenantId);
  }

  /**
   * Gets all overrides registered for a user within a tenant.
   *
   * @param userId The ID of the user
   * @param tenantId The ID of the tenant scope
   * @returns UserOverrides structure containing allowed and denied permission arrays
   */
  public getUserOverrides(userId: string, tenantId: string): UserOverrides {
    const tenantMap = this.userOverrides.get(userId);
    const record = tenantMap?.get(tenantId);
    if (!record) {
      return { allow: [], deny: [] };
    }
    return {
      allow: Array.from(record.allow),
      deny: Array.from(record.deny),
    };
  }

  /**
   * Returns the set of allow overrides for a user within a tenant.
   */
  public getAllowSet(userId: string, tenantId: string): Set<string> | undefined {
    return this.userOverrides.get(userId)?.get(tenantId)?.allow;
  }

  /**
   * Returns the set of deny overrides for a user within a tenant.
   */
  public getDenySet(userId: string, tenantId: string): Set<string> | undefined {
    return this.userOverrides.get(userId)?.get(tenantId)?.deny;
  }

  /**
   * Clears all user override mappings.
   */
  public clear(): void {
    this.userOverrides.clear();
  }

  /**
   * Retrieves or creates a UserOverrideRecord for a user within a tenant.
   */
  private getOrCreateRecord(userId: string, tenantId: string): UserOverrideRecord {
    let tenantMap = this.userOverrides.get(userId);
    if (!tenantMap) {
      tenantMap = new Map<string, UserOverrideRecord>();
      this.userOverrides.set(userId, tenantMap);
    }

    let record = tenantMap.get(tenantId);
    if (!record) {
      record = {
        allow: new Set<string>(),
        deny: new Set<string>(),
      };
      tenantMap.set(tenantId, record);
    }
    return record;
  }

  /**
   * Removes a user's record completely if both Sets are empty.
   */
  private cleanIfEmpty(userId: string, tenantId: string): void {
    const tenantMap = this.userOverrides.get(userId);
    if (tenantMap) {
      const record = tenantMap.get(tenantId);
      if (record && record.allow.size === 0 && record.deny.size === 0) {
        tenantMap.delete(tenantId);
      }
      if (tenantMap.size === 0) {
        this.userOverrides.delete(userId);
      }
    }
  }
}
