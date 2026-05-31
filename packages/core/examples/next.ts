import { AccessControl } from '../src/index.js';

// Setup Mock AccessControl instance
const auth = new AccessControl();
auth.role('Manager');
auth.permission('patient.*');
auth.grant('Manager', 'patient.*');
auth.assignRole('u1', 'Manager');

// Mock session helper
async function getSessionUser() {
  return { id: 'u1' }; // Mock session resolved user
}

/**
 * 1. NEXT.JS SERVER ACTIONS PROTECTION
 * Highly secure, server-side code execution checks.
 */
export async function deletePatientRecordAction(patientId: string) {
  const user = await getSessionUser();

  // Guard access explicitly using AccessControl
  const hasAccess = auth.can(user, 'patient.delete');
  if (!hasAccess) {
    throw new Error('Forbidden: Insufficient privileges.');
  }

  console.log(`[Next.js Server Action]: Successfully deleted patient ${patientId}`);
  return { success: true };
}

/**
 * 2. NEXT.JS ROUTE HANDLER (API ROUTE) PROTECTION
 * Standard GET/POST Route Handler endpoint protections.
 */
export async function GET(_request: Request) {
  const user = await getSessionUser();

  const hasAccess = auth.can(user, 'patient.view');
  if (!hasAccess) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ data: 'Sensitive Patient Medical Details' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
