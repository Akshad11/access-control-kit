import React, { createContext, useContext, ReactNode } from 'react';
import { AccessControl, User } from '../src/index.js';

// Setup Mock AccessControl instance
const auth = new AccessControl();
auth.role('Employee');
auth.permission('patient.view');
auth.grant('Employee', 'patient.view');

// 1. Create access control context
export const AccessControlContext = createContext<AccessControl>(auth);

interface AccessControlProviderProps {
  children: ReactNode;
  value?: AccessControl;
}

/**
 * AccessControlProvider provides the initialized AccessControl instance to the subtree.
 */
export function AccessControlProvider({ children, value }: AccessControlProviderProps) {
  return (
    <AccessControlContext.Provider value={value || auth}>
      {children}
    </AccessControlContext.Provider>
  );
}

/**
 * Custom React Hook to query permissions cleanly.
 */
export function useAccessControl(user: User) {
  const ac = useContext(AccessControlContext);
  return {
    can: (permission: string) => ac.can(user, permission),
  };
}

interface CanProps {
  user: User;
  perform: string;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Can is a declarative wrapper component for conditionally displaying UI elements.
 */
export function Can({ user, perform, children, fallback = null }: CanProps) {
  const { can } = useAccessControl(user);
  return can(perform) ? <>{children}</> : <>{fallback}</>;
}

/**
 * Example React UI Component demonstrating conditional styling and rendering.
 */
export function PatientDashboard({ currentUser }: { currentUser: User }) {
  return (
    <AccessControlProvider>
      <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
        <h2>Medical Portal</h2>

        {/* Declarative permission protection */}
        <Can
          user={currentUser}
          perform="patient.view"
          fallback={<div className="alert">You do not have access to view patient files.</div>}
        >
          <div className="card">
            <h3>Patient Diagnostic Files</h3>
            <p>Diagnoses, active charts, and prescriptions.</p>

            {/* Inline Hook checking for micro-interactions */}
            <Can user={currentUser} perform="patient.edit">
              <button onClick={() => alert('Editing records...')}>Edit Diagnosis</button>
            </Can>
          </div>
        </Can>
      </div>
    </AccessControlProvider>
  );
}
