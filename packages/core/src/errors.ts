/**
 * Base error class for all Access Control Kit exceptions.
 */
export class AccessControlError extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when trying to register a role name that already exists.
 */
export class RoleAlreadyExistsError extends AccessControlError {
  override readonly name = 'RoleAlreadyExistsError';
  constructor(roleName: string) {
    super(`Role "${roleName}" already exists.`);
  }
}

/**
 * Thrown when trying to register a permission that already exists.
 */
export class PermissionAlreadyExistsError extends AccessControlError {
  override readonly name = 'PermissionAlreadyExistsError';
  constructor(permission: string) {
    super(`Permission "${permission}" already exists.`);
  }
}

/**
 * Thrown when a role cannot be found in the registry.
 */
export class RoleNotFoundError extends AccessControlError {
  override readonly name = 'RoleNotFoundError';
  constructor(roleName: string) {
    super(`Role "${roleName}" was not found.`);
  }
}

/**
 * Thrown when a permission cannot be found in the registry.
 */
export class PermissionNotFoundError extends AccessControlError {
  override readonly name = 'PermissionNotFoundError';
  constructor(permission: string) {
    super(`Permission "${permission}" was not found.`);
  }
}

/**
 * Thrown when a role name is invalid (empty, whitespace-only).
 */
export class InvalidRoleError extends AccessControlError {
  override readonly name = 'InvalidRoleError';
  constructor(message: string) {
    super(message);
  }
}

/**
 * Thrown when a permission structure is malformed or invalid.
 */
export class InvalidPermissionError extends AccessControlError {
  override readonly name = 'InvalidPermissionError';
  constructor(message: string) {
    super(message);
  }
}

/**
 * Thrown when a circular inheritance relation is detected.
 */
export class CircularRoleInheritanceError extends AccessControlError {
  override readonly name = 'CircularRoleInheritanceError';
  constructor(roleName: string, parentName: string) {
    super(`Adding ${roleName} -> ${parentName} creates a cycle.`);
  }
}

/**
 * Thrown when trying to inherit from a role that does not exist.
 */
export class InheritanceRoleNotFoundError extends AccessControlError {
  override readonly name = 'InheritanceRoleNotFoundError';
  constructor(parentName: string) {
    super(`Parent role "${parentName}" was not found.`);
  }
}
