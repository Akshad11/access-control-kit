import { Injectable, CanActivate, ExecutionContext, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AccessControl } from '../src/index.js';

// Setup Mock AccessControl instance (or provide via Nest Dependency Injection module)
const auth = new AccessControl();
auth.role('Admin');
auth.permission('user.delete');
auth.grant('Admin', 'user.delete');
auth.assignRole('u1', 'Admin');

// Metadata key name
export const REQUIRE_PERMISSION_KEY = 'require_permission';

/**
 * Custom NestJS Decorator to specify the required permission on endpoint routes.
 *
 * Usage:
 * `@RequirePermission('user.delete')`
 */
export const RequirePermission = (permission: string) => SetMetadata(REQUIRE_PERMISSION_KEY, permission);

/**
 * Custom NestJS Guard executing access control checks at request boundaries.
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly accessControl: AccessControl = auth, // Can be injected globally
  ) {}

  public canActivate(context: ExecutionContext): boolean {
    // 1. Read metadata from handler or controller
    const requiredPermission = this.reflector.getAllAndOverride<string>(
      REQUIRE_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no permission metadata is set, access is granted by default
    if (!requiredPermission) {
      return true;
    }

    // 2. Extract request and user object (assumes user is loaded via AuthGuard/Passport)
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || typeof user.id !== 'string') {
      return false;
    }

    // 3. Resolve permission check
    return this.accessControl.can(user, requiredPermission);
  }
}
