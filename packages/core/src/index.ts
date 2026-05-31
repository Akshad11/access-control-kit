export { AccessControl } from './AccessControl.js';
export { RoleRegistry } from './RoleRegistry.js';
export { PermissionRegistry } from './PermissionRegistry.js';
export { UserRoleStore } from './UserRoleStore.js';
export { PermissionResolver } from './PermissionResolver.js';
export { WildcardMatcher } from './WildcardMatcher.js';
export { RoleBuilder } from './RoleBuilder.js';
export { UserOverrideStore } from './UserOverrideStore.js';

export {
  AccessControlError,
  RoleAlreadyExistsError,
  PermissionAlreadyExistsError,
  RoleNotFoundError,
  PermissionNotFoundError,
  InvalidRoleError,
  InvalidPermissionError,
  CircularRoleInheritanceError,
  InheritanceRoleNotFoundError,
  UserOverrideNotFoundError,
} from './errors.js';

export type { User, Role, Permission, UserOverrides, UserOverrideRecord } from './types.js';
