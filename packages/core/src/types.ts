/**
 * Represents a user within the system.
 */
export interface User {
  id: string;
  /**
   * Optional pre-resolved roles for the user.
   * If provided, permission checking will bypass the in-memory store
   * and use these roles directly, enabling stateless integration.
   */
  roles?: string[];
}

/**
 * Represents a security role containing a unique name.
 */
export interface Role {
  name: string;
}

/**
 * Represents a permission string (which can be concrete or include wildcards).
 */
export type Permission = string;
