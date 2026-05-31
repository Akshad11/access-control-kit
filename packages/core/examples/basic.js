import { AccessControl, InvalidPermissionError } from '../dist/index.js';

// Initialize the AccessControl manager
const auth = new AccessControl();

console.log('--- 1. Registering Roles ---');
auth.role('Admin');
auth.role('Manager');
auth.role('Employee');
console.log('Roles registered successfully.');

console.log('\n--- 2. Registering Permissions ---');
auth.permission('user.create');
auth.permission('user.delete');
auth.permission('patient.view');
auth.permission('patient.edit');
auth.permission('patient.*');
auth.permission('*');
console.log('Permissions registered successfully.');

console.log('\n--- 3. Granting Permissions ---');
auth.grant('Admin', '*');
auth.grant('Manager', 'patient.*');
auth.grant('Employee', 'patient.view');
console.log('Grants mapped successfully.');

console.log('\n--- 4. Assigning Roles to Users ---');
auth.assignRole('u_admin', 'Admin');
auth.assignRole('u_manager', 'Manager');
auth.assignRole('u_employee', 'Employee');
console.log('User roles assigned successfully.');

console.log('\n--- 5. Performing Access Checks ---');

const employee = { id: 'u_employee' };
const manager = { id: 'u_manager' };
const admin = { id: 'u_admin' };

console.log(`Employee can view patient? -> ${auth.can(employee, 'patient.view')}`); // true
console.log(`Employee can edit patient? -> ${auth.can(employee, 'patient.edit')}`); // false

console.log(`Manager can view patient? -> ${auth.can(manager, 'patient.view')}`); // true (via patient.*)
console.log(`Manager can edit patient? -> ${auth.can(manager, 'patient.edit')}`); // true (via patient.*)
console.log(`Manager can create user? -> ${auth.can(manager, 'user.create')}`); // false

console.log(`Admin can delete user? -> ${auth.can(admin, 'user.delete')}`); // true (via *)
console.log(`Admin can view patient? -> ${auth.can(admin, 'patient.view')}`); // true (via *)

console.log('\n--- 6. Exception Handling ---');
try {
  // Trying to register a malformed permission
  auth.permission('***.invalid');
} catch (error) {
  if (error instanceof InvalidPermissionError) {
    console.log(`Successfully caught expected error: ${error.message}`);
  } else {
    console.error('Unexpected error:', error);
  }
}
