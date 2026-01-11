// Mock providers file to avoid react-refresh warnings
import React from 'react';
import { SessionContext } from '@/contexts/SessionContext';
import { AuthContext } from '@/contexts/AuthContext';
import {
  createMockSimpleOrgValue,
  mockAuthContextValue,
  mockSessionContextValue,
} from '@/test/utils/mock-provider-values';
import { SimpleOrganizationContext } from '@/contexts/SimpleOrganizationContext';

// Type for auth context value - matches AuthContext shape
type AuthContextValue = typeof mockAuthContextValue;

// Type for session context value - matches SessionContext shape  
type SessionContextValue = typeof mockSessionContextValue;

// Type for simple org context value
type SimpleOrgContextValue = ReturnType<typeof createMockSimpleOrgValue>;

export const MockAuthProvider = ({ 
  children,
  value
}: { 
  children: React.ReactNode;
  value?: AuthContextValue;
}) => (
  <AuthContext.Provider value={value ?? mockAuthContextValue}>
    <div data-testid="mock-auth-provider">{children}</div>
  </AuthContext.Provider>
);

export const MockSessionProvider = ({ 
  children,
  value 
}: { 
  children: React.ReactNode;
  value?: SessionContextValue;
}) => (
  <SessionContext.Provider value={value ?? mockSessionContextValue}>
    <div data-testid="mock-session-provider">{children}</div>
  </SessionContext.Provider>
);

export const MockUserProvider = ({ children }: { children: React.ReactNode }) => (
  <div data-testid="mock-user-provider">{children}</div>
);

export const MockSimpleOrganizationProvider = ({ 
  children, 
  value 
}: { 
  children: React.ReactNode;
  value?: SimpleOrgContextValue;
}) => (
  <SimpleOrganizationContext.Provider value={value ?? createMockSimpleOrgValue()}>
    <div data-testid="mock-organization-provider">{children}</div>
  </SimpleOrganizationContext.Provider>
);

export const MockSessionProvider2 = ({ children }: { children: React.ReactNode }) => (
  <div data-testid="mock-session-provider-2">{children}</div>
);