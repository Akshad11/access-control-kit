import { PermissionRegistry } from './PermissionRegistry.js';
import { TemporaryPermission, GrantTemporaryOptions } from './types.js';
import {
  PermissionNotFoundError,
  InvalidExpirationDateError,
  TemporaryPermissionNotFoundError,
} from './errors.js';

/**
 * TemporaryPermissionStore manages the in-memory storage, mappings, validation,
 * and expirations of user-specific temporary permissions.
 */
export class TemporaryPermissionStore {
  private readonly store = new Map<string, TemporaryPermission[]>();

  constructor(private readonly permissionRegistry: PermissionRegistry) {}

  /**
   * Grants a temporary permission to a user.
   *
   * @param options Details of the temporary grant
   * @throws PermissionNotFoundError if the permission is not registered
   * @throws InvalidExpirationDateError if the expiration date is invalid or in the past
   */
  public grantTemporary(options: GrantTemporaryOptions): void {
    const { userId, permission, expiresAt } = options;

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

    let records = this.store.get(userId);
    if (!records) {
      records = [];
      this.store.set(userId, records);
    }

    const existingRecord = records.find((r) => r.permission === permission);
    if (existingRecord) {
      existingRecord.expiresAt = expiresAt;
    } else {
      records.push({ permission, expiresAt });
    }
  }

  /**
   * Revokes a temporary permission from a user.
   *
   * @param userId The ID of the user
   * @param permission The permission to revoke
   * @throws TemporaryPermissionNotFoundError if the temporary permission does not exist
   */
  public revokeTemporary(userId: string, permission: string): void {
    const records = this.store.get(userId);
    if (!records) {
      throw new TemporaryPermissionNotFoundError(userId, permission);
    }

    const index = records.findIndex((r) => r.permission === permission);
    if (index === -1) {
      throw new TemporaryPermissionNotFoundError(userId, permission);
    }

    records.splice(index, 1);
    if (records.length === 0) {
      this.store.delete(userId);
    }
  }

  /**
   * Retrieves all temporary permissions registered for a user.
   *
   * @param userId The ID of the user
   * @returns An array of temporary permissions
   */
  public getTemporaryPermissions(userId: string): TemporaryPermission[] {
    const records = this.store.get(userId);
    return records ? records.map((r) => ({ ...r })) : [];
  }

  /**
   * Scans and removes all expired temporary permission records.
   *
   * @returns An array of userIds whose expired permissions were cleaned up
   */
  public cleanupExpiredPermissions(): string[] {
    const now = Date.now();
    const cleanedUserIds: string[] = [];

    for (const [userId, records] of this.store.entries()) {
      const initialSize = records.length;
      const validRecords = records.filter((r) => r.expiresAt.getTime() > now);

      if (validRecords.length < initialSize) {
        cleanedUserIds.push(userId);
        if (validRecords.length === 0) {
          this.store.delete(userId);
        } else {
          this.store.set(userId, validRecords);
        }
      }
    }

    return cleanedUserIds;
  }

  /**
   * Cleans up expired temporary permissions for a specific user ID.
   *
   * @param userId The ID of the user to clean up
   * @returns true if any expired permissions were cleaned up, false otherwise
   */
  public cleanupUserExpiredPermissions(userId: string): boolean {
    const records = this.store.get(userId);
    if (!records) {
      return false;
    }

    const now = Date.now();
    const initialSize = records.length;
    const validRecords = records.filter((r) => r.expiresAt.getTime() > now);

    if (validRecords.length < initialSize) {
      if (validRecords.length === 0) {
        this.store.delete(userId);
      } else {
        this.store.set(userId, validRecords);
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
