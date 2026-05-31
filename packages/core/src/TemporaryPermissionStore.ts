import { PermissionRegistry } from './PermissionRegistry.js';
import { TemporaryPermission, GrantTemporaryOptions } from './types.js';
import {
  PermissionNotFoundError,
  InvalidExpirationDateError,
  TemporaryPermissionNotFoundError,
} from './errors.js';

/**
 * TemporaryPermissionStore manages the in-memory storage, mappings, validation,
 * and expirations of user-specific temporary permissions per tenant.
 */
export class TemporaryPermissionStore {
  // Structure: Map<userId, Map<tenantId, TemporaryPermission[]>>
  private readonly store = new Map<string, Map<string, TemporaryPermission[]>>();

  constructor(private readonly permissionRegistry: PermissionRegistry) {}

  /**
   * Grants a temporary permission to a user within a tenant scope.
   *
   * @param options Details of the temporary grant
   * @throws PermissionNotFoundError if the permission is not registered
   * @throws InvalidExpirationDateError if the expiration date is invalid or in the past
   */
  public grantTemporary(options: GrantTemporaryOptions): void {
    const { userId, permission, expiresAt } = options;
    const tenantId = options.tenantId || '__default__';

    // Validate permission registry presence
    if (!this.permissionRegistry.has(permission)) {
      throw new PermissionNotFoundError(permission);
    }

    // Validate expiration date
    if (
      !(expiresAt instanceof Date) ||
      isNaN(expiresAt.getTime()) ||
      expiresAt.getTime() <= Date.now()
    ) {
      throw new InvalidExpirationDateError();
    }

    let tenantMap = this.store.get(userId);
    if (!tenantMap) {
      tenantMap = new Map<string, TemporaryPermission[]>();
      this.store.set(userId, tenantMap);
    }

    let records = tenantMap.get(tenantId);
    if (!records) {
      records = [];
      tenantMap.set(tenantId, records);
    }

    const existingRecord = records.find((r) => r.permission === permission);
    if (existingRecord) {
      existingRecord.expiresAt = expiresAt;
    } else {
      records.push({ permission, expiresAt });
    }
  }

  /**
   * Revokes a temporary permission from a user within a tenant scope.
   *
   * @param userId The ID of the user
   * @param permission The permission to revoke
   * @param tenantId The ID of the tenant scope
   * @throws TemporaryPermissionNotFoundError if the temporary permission does not exist
   */
  public revokeTemporary(userId: string, permission: string, tenantId: string): void {
    const tenantMap = this.store.get(userId);
    if (!tenantMap) {
      throw new TemporaryPermissionNotFoundError(userId, permission);
    }
    const records = tenantMap.get(tenantId);
    if (!records) {
      throw new TemporaryPermissionNotFoundError(userId, permission);
    }

    const index = records.findIndex((r) => r.permission === permission);
    if (index === -1) {
      throw new TemporaryPermissionNotFoundError(userId, permission);
    }

    records.splice(index, 1);
    if (records.length === 0) {
      tenantMap.delete(tenantId);
      if (tenantMap.size === 0) {
        this.store.delete(userId);
      }
    }
  }

  /**
   * Retrieves all temporary permissions registered for a user within a tenant scope.
   *
   * @param userId The ID of the user
   * @param tenantId The ID of the tenant scope
   * @returns An array of temporary permissions
   */
  public getTemporaryPermissions(userId: string, tenantId: string): TemporaryPermission[] {
    const tenantMap = this.store.get(userId);
    const records = tenantMap?.get(tenantId);
    return records ? records.map((r) => ({ ...r })) : [];
  }

  /**
   * Scans and removes all expired temporary permission records.
   *
   * @returns An array of { userId, tenantId } coordinates whose expired permissions were cleaned up
   */
  public cleanupExpiredPermissions(): { userId: string; tenantId: string }[] {
    const now = Date.now();
    const cleanedCoordinates: { userId: string; tenantId: string }[] = [];

    for (const [userId, tenantMap] of this.store.entries()) {
      for (const [tenantId, records] of tenantMap.entries()) {
        const initialSize = records.length;
        const validRecords = records.filter((r) => r.expiresAt.getTime() > now);

        if (validRecords.length < initialSize) {
          cleanedCoordinates.push({ userId, tenantId });
          if (validRecords.length === 0) {
            tenantMap.delete(tenantId);
          } else {
            tenantMap.set(tenantId, validRecords);
          }
        }
      }
      if (tenantMap.size === 0) {
        this.store.delete(userId);
      }
    }

    return cleanedCoordinates;
  }

  /**
   * Cleans up expired temporary permissions for a specific user ID and tenant.
   *
   * @param userId The ID of the user to clean up
   * @param tenantId The ID of the tenant scope to clean up
   * @returns true if any expired permissions were cleaned up, false otherwise
   */
  public cleanupUserExpiredPermissions(userId: string, tenantId: string): boolean {
    const tenantMap = this.store.get(userId);
    if (!tenantMap) {
      return false;
    }
    const records = tenantMap.get(tenantId);
    if (!records) {
      return false;
    }

    const now = Date.now();
    const initialSize = records.length;
    const validRecords = records.filter((r) => r.expiresAt.getTime() > now);

    if (validRecords.length < initialSize) {
      if (validRecords.length === 0) {
        tenantMap.delete(tenantId);
        if (tenantMap.size === 0) {
          this.store.delete(userId);
        }
      } else {
        tenantMap.set(tenantId, validRecords);
      }
      return true;
    }

    return false;
  }

  /**
   * Clears all temporary permissions.
   */
  public clear(): void {
    this.store.clear();
  }
}
