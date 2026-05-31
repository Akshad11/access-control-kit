import { InvalidRoleError, InvalidPermissionError } from './errors.js';

/**
 * Validates a role name.
 * A role name must be non-empty, unique, and not contain only whitespace.
 *
 * @param name The role name to validate
 * @throws InvalidRoleError if the name is invalid
 */
export function validateRoleName(name: string): void {
  if (typeof name !== 'string') {
    throw new InvalidRoleError('Role name must be a string.');
  }
  const trimmed = name.trim();
  if (trimmed === '') {
    throw new InvalidRoleError('Role name cannot be empty or whitespace-only.');
  }
}

// Regex to validate permissions.
// Allows segment based permissions containing lowercase/uppercase alphanumeric characters, hyphens, and underscores,
// or a single asterisk per segment, e.g., 'user.create', 'patient.*', '*', etc.
// Rejects empty segments, double dots, leading/trailing dots, or multiple asterisks in a segment (e.g. '***').
const PERMISSION_REGEX = /^(?:\*|[a-zA-Z0-9_-]+)(?:\.(?:\*|[a-zA-Z0-9_-]+))*$/;

/**
 * Validates a permission string structure.
 *
 * @param permission The permission to validate
 * @throws InvalidPermissionError if the permission structure is invalid
 */
export function validatePermission(permission: string): void {
  if (typeof permission !== 'string') {
    throw new InvalidPermissionError('Permission must be a string.');
  }
  const trimmed = permission.trim();
  if (trimmed === '') {
    throw new InvalidPermissionError('Permission cannot be empty or whitespace-only.');
  }
  if (!PERMISSION_REGEX.test(trimmed)) {
    throw new InvalidPermissionError(
      `Invalid permission format: "${permission}". Must be dot-separated alphanumeric segments or asterisks (e.g. "user.create", "patient.*", "*").`,
    );
  }
}
