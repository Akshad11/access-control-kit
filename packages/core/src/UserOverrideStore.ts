import { PermissionRegistry } from './PermissionRegistry.js';
import { UserOverrideRecord, UserOverrides } from './types.js';
import { PermissionNotFoundError, UserOverrideNotFoundError } from './errors.js';

/**
 * UserOverrideStore manages the in-memory storage, mappings, and validation
 * of user-specific permission overrides.
 */
export class UserOverrideStore {
  private readonly userOverrides = new Map<string, UserOverrideRecord>();

  constructor(private readonly permissionRegistry: PermissionRegistry) {}

  /**
   * Registers a user-specific allow override.
   *
   * @param userId The ID of the user
   * @param permission The permission to override
   * @throws PermissionNotFoundError if the permission is not registered
   */
  public allowUser(userId: string, permission: string): void {
    if (!this.permissionRegistry.has(permission)) {
      throw new PermissionNotFoundError(permission);
    }

    const record = this.getOrCreateRecord(userId);
    record.allow.add(permission);
  }

  /**
   * Registers a user-specific deny override.
   *
   * @param userId The ID of the user
   * @param permission The permission to override
   * @throws PermissionNotFoundError if the permission is not registered
   */
  public denyUser(userId: string, permission: string): void {
    if (!this.permissionRegistry.has(permission)) {
      throw new PermissionNotFoundError(permission);
    }

    const record = this.getOrCreateRecord(userId);
    record.deny.add(permission);
  }

  /**
   * Removes a user-specific allow override.
   *
   * @param userId The ID of the user
   * @param permission The permission override to remove
   * @throws UserOverrideNotFoundError if the allow override does not exist
   */
  public removeUserAllow(userId: string, permission: string): void {
    const record = this.userOverrides.get(userId);
    if (!record || !record.allow.has(permission)) {
      throw new UserOverrideNotFoundError(userId, 'allow', permission);
    }

    record.allow.delete(permission);
    this.cleanIfEmpty(userId);
  }

  /**
   * Removes a user-specific deny override.
   *
   * @param userId The ID of the user
   * @param permission The permission override to remove
   * @throws UserOverrideNotFoundError if the deny override does not exist
   */
  public removeUserDeny(userId: string, permission: string): void {
    const record = this.userOverrides.get(userId);
    if (!record || !record.deny.has(permission)) {
      throw new UserOverrideNotFoundError(userId, 'deny', permission);
    }

    record.deny.delete(permission);
    this.cleanIfEmpty(userId);
  }

  /**
   * Gets all overrides registered for a user.
   *
   * @param userId The ID of the user
   * @returns UserOverrides structure containing allowed and denied permission arrays
   */
  public getUserOverrides(userId: string): UserOverrides {
    const record = this.userOverrides.get(userId);
    if (!record) {
      return { allow: [], deny: [] };
    }
    return {
      allow: Array.from(record.allow),
      deny: Array.from(record.deny),
    };
  }

  /**
   * Returns the set of allow overrides for a user.
   */
  public getAllowSet(userId: string): Set<string> | undefined {
    return this.userOverrides.get(userId)?.allow;
  }

  /**
   * Returns the set of deny overrides for a user.
   */
  public getDenySet(userId: string): Set<string> | undefined {
    return this.userOverrides.get(userId)?.deny;
  }

  /**
   * Clears all user override mappings.
   */
  public clear(): void {
    this.userOverrides.clear();
  }

  /**
   * Retrieves or creates a UserOverrideRecord for a user.
   */
  private getOrCreateRecord(userId: string): UserOverrideRecord {
    let record = this.userOverrides.get(userId);
    if (!record) {
      record = {
        allow: new Set<string>(),
        deny: new Set<string>(),
      };
      this.userOverrides.set(userId, record);
    }
    return record;
  }

  /**
   * Removes a user's record completely if both Sets are empty.
   */
  private cleanIfEmpty(userId: string): void {
    const record = this.userOverrides.get(userId);
    if (record && record.allow.size === 0 && record.deny.size === 0) {
      this.userOverrides.delete(userId);
    }
  }
}
