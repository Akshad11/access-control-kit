import { AccessControl } from '../src/index.js';

// Setup Mock AccessControl instance
const auth = new AccessControl();
auth.role('Manager');
auth.permission('patient.*');
auth.grant('Manager', 'patient.*');
auth.assignRole('u1', 'Manager');

/**
 * Example Express authorization middleware generator.
 * Assumes req.user is populated by an authentication middleware beforehand.
 */
export function requirePermission(permission: string) {
  return (req: any, res: any, next: any) => {
    // 1. Verify user is authenticated
    if (!req.user || typeof req.user.id !== 'string') {
      return res.status(401).json({ error: 'Unauthenticated' });
    }

    // 2. Perform authorization check using AccessControl
    const hasAccess = auth.can(req.user, permission);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    next();
  };
}

// Mock Express usage demonstration
console.log('--- Express Integration Example ---');

const mockReqSuccess = { user: { id: 'u1' } };
const mockReqFail = { user: { id: 'u2' } }; // u2 has no roles assigned

const mockRes = {
  status: (code: number) => ({
    json: (data: any) => console.log(`[Express Response ${code}]:`, data),
  }),
};
const mockNext = () => console.log('[Express Middleware]: Authorized, calling next handler.');

const middleware = requirePermission('patient.edit');

console.log('Case 1: User u1 has Manager role (patient.* grant)');
middleware(mockReqSuccess, mockRes as any, mockNext);

console.log('\nCase 2: User u2 has no permissions');
middleware(mockReqFail, mockRes as any, mockNext);
