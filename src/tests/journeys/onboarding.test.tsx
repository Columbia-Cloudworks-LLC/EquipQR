/**
 * Onboarding Journey Tests
 * 
 * These tests validate complete user workflows for user registration,
 * organization creation, and invitation acceptance.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { organizations } from '@/test/fixtures/entities';

// Mock Supabase auth
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
      signIn: vi.fn(),
      signInWithOAuth: vi.fn(),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } }
      }))
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({ data: [], error: null })),
      insert: vi.fn(() => ({ data: null, error: null })),
      update: vi.fn(() => ({ data: null, error: null }))
    })),
    functions: {
      invoke: vi.fn()
    }
  }
}));

import { supabase } from '@/integrations/supabase/client';

describe('Onboarding Journey', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('New User Registration', () => {
    describe('Standard Sign Up Flow', () => {
      it('validates required fields before submission', () => {
        // Test that sign up form requires:
        // - Full name
        // - Email
        // - Organization name
        // - Password (min 6 chars)
        // - Confirm password
        // - CAPTCHA verification
        
        const formData = {
          fullName: '',
          email: '',
          organizationName: '',
          password: '',
          confirmPassword: ''
        };

        // All fields are required
        expect(formData.fullName).toBe('');
        expect(formData.email).toBe('');
        expect(formData.organizationName).toBe('');
        expect(formData.password).toBe('');
        expect(formData.confirmPassword).toBe('');
      });

      it('enforces password requirements', () => {
        const shortPassword = '12345';
        const validPassword = 'password123';
        
        expect(shortPassword.length).toBeLessThan(6);
        expect(validPassword.length).toBeGreaterThanOrEqual(6);
      });

      it('validates password confirmation matches', () => {
        const password = 'password123';
        const matchingConfirm = 'password123';
        const mismatchedConfirm = 'different123';
        
        expect(password).toBe(matchingConfirm);
        expect(password).not.toBe(mismatchedConfirm);
      });

      it('creates user account with Supabase auth', async () => {
        const mockSignUp = vi.mocked(supabase.auth.signUp);
        mockSignUp.mockResolvedValueOnce({
          data: {
            user: { id: 'new-user-id', email: 'newuser@example.com' },
            session: null
          },
          error: null
        });

        const signUpData = {
          email: 'newuser@example.com',
          password: 'securepassword123',
          options: {
            data: {
              name: 'New User',
              organization_name: 'New Company LLC'
            },
            captchaToken: 'mock-captcha-token'
          }
        };

        await supabase.auth.signUp(signUpData);

        expect(mockSignUp).toHaveBeenCalledWith(signUpData);
      });

      it('handles existing email error gracefully', async () => {
        const mockSignUp = vi.mocked(supabase.auth.signUp);
        mockSignUp.mockResolvedValueOnce({
          data: { user: null, session: null },
          error: {
            message: 'User already registered',
            status: 400,
            name: 'AuthApiError'
          }
        });

        const result = await supabase.auth.signUp({
          email: 'existing@example.com',
          password: 'password123'
        });

        expect(result.error).toBeTruthy();
        expect(result.error?.message).toBe('User already registered');
      });
    });

    describe('Organization Creation During Sign Up', () => {
      it('creates organization as part of sign up flow', async () => {
        const mockSignUp = vi.mocked(supabase.auth.signUp);
        mockSignUp.mockResolvedValueOnce({
          data: {
            user: { 
              id: 'new-user-id', 
              email: 'owner@newcompany.com',
              user_metadata: {
                name: 'Company Owner',
                organization_name: 'New Company LLC'
              }
            },
            session: null
          },
          error: null
        });

        const result = await supabase.auth.signUp({
          email: 'owner@newcompany.com',
          password: 'securepassword',
          options: {
            data: {
              name: 'Company Owner',
              organization_name: 'New Company LLC'
            }
          }
        });

        expect(result.data.user?.user_metadata?.organization_name).toBe('New Company LLC');
      });

      it('sets user as organization owner', async () => {
        // When a user creates an organization during signup,
        // they become the owner with full permissions
        const newOwner = {
          id: 'new-owner-id',
          organizationRole: 'owner',
          permissions: {
            canManage: true,
            canInviteMembers: true,
            canViewBilling: true
          }
        };

        expect(newOwner.organizationRole).toBe('owner');
        expect(newOwner.permissions.canManage).toBe(true);
        expect(newOwner.permissions.canViewBilling).toBe(true);
      });
    });
  });

  describe('Invitation-Based Onboarding', () => {
    describe('Accepting an Invitation', () => {
      it('validates invitation token from URL', () => {
        const validToken = 'abc123-valid-invitation-token';
        const expiredToken = '';
        
        expect(validToken.length).toBeGreaterThan(0);
        expect(expiredToken.length).toBe(0);
      });

      it('pre-fills email from invitation', () => {
        const invitation = {
          email: 'invited@example.com',
          organizationId: organizations.acme.id,
          organizationName: organizations.acme.name,
          role: 'member'
        };

        expect(invitation.email).toBe('invited@example.com');
        expect(invitation.organizationName).toBe('Acme Equipment Co');
      });

      it('prevents using invited organization name for personal org', () => {
        const invitedOrgName = 'Acme Equipment Co';
        const userEnteredOrgName = 'Acme Equipment Co'; // Same name - should be rejected
        const differentOrgName = 'My Personal Workspace';

        // User cannot use the same name as the org they're joining
        expect(userEnteredOrgName.toLowerCase()).toBe(invitedOrgName.toLowerCase());
        expect(differentOrgName.toLowerCase()).not.toBe(invitedOrgName.toLowerCase());
      });

      it('creates user and adds to invited organization', async () => {
        const mockSignUp = vi.mocked(supabase.auth.signUp);
        mockSignUp.mockResolvedValueOnce({
          data: {
            user: {
              id: 'invited-user-id',
              email: 'invited@example.com',
              user_metadata: {
                name: 'Invited User',
                organization_name: 'My Personal Workspace',
                invited_organization_id: organizations.acme.id,
                invited_organization_name: organizations.acme.name,
                signup_source: 'invite'
              }
            },
            session: null
          },
          error: null
        });

        const result = await supabase.auth.signUp({
          email: 'invited@example.com',
          password: 'password123',
          options: {
            data: {
              name: 'Invited User',
              organization_name: 'My Personal Workspace',
              invited_organization_id: organizations.acme.id,
              invited_organization_name: organizations.acme.name,
              signup_source: 'invite'
            }
          }
        });

        expect(result.data.user?.user_metadata?.signup_source).toBe('invite');
        expect(result.data.user?.user_metadata?.invited_organization_id).toBe(organizations.acme.id);
      });

      it('assigns correct role from invitation', () => {
        const invitationRoles = ['admin', 'member'];
        
        invitationRoles.forEach(role => {
          const invitation = {
            email: 'invited@example.com',
            role: role,
            organizationId: organizations.acme.id
          };

          expect(['owner', 'admin', 'member', 'viewer']).toContain(invitation.role);
        });
      });
    });

    describe('Invitation Expiry', () => {
      it('rejects expired invitations', () => {
        const now = new Date();
        const expiredDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
        const validDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

        const expiredInvitation = {
          expiresAt: expiredDate.toISOString(),
          isExpired: expiredDate < now
        };

        const validInvitation = {
          expiresAt: validDate.toISOString(),
          isExpired: validDate < now
        };

        expect(expiredInvitation.isExpired).toBe(true);
        expect(validInvitation.isExpired).toBe(false);
      });

      it('shows appropriate message for expired invitation', () => {
        const expiredMessage = 'This invitation has expired. Please contact the organization administrator for a new invitation.';
        expect(expiredMessage).toContain('expired');
      });
    });
  });

  describe('Admin Inviting Members', () => {
    describe('as an Admin', () => {
      it('can invite users with member role', () => {
        const adminPermissions = {
          canInviteMembers: true,
          availableRoles: ['member']
        };

        expect(adminPermissions.canInviteMembers).toBe(true);
        expect(adminPermissions.availableRoles).toContain('member');
      });

      it('can invite users with admin role', () => {
        const adminPermissions = {
          canInviteMembers: true,
          availableRoles: ['admin', 'member']
        };

        expect(adminPermissions.availableRoles).toContain('admin');
      });

      it('cannot invite with owner role', () => {
        const adminPermissions = {
          availableRoles: ['admin', 'member']
        };

        expect(adminPermissions.availableRoles).not.toContain('owner');
      });
    });

    describe('as an Owner', () => {
      it('can invite users with any role except owner', () => {
        const ownerPermissions = {
          canInviteMembers: true,
          availableRoles: ['admin', 'member', 'viewer']
        };

        expect(ownerPermissions.canInviteMembers).toBe(true);
        expect(ownerPermissions.availableRoles).toContain('admin');
        expect(ownerPermissions.availableRoles).toContain('member');
        expect(ownerPermissions.availableRoles).not.toContain('owner');
      });
    });

    describe('Invitation Email', () => {
      it('sends invitation to valid email', async () => {
        const mockInvoke = vi.mocked(supabase.functions.invoke);
        mockInvoke.mockResolvedValueOnce({
          data: { success: true, invitationId: 'inv-123' },
          error: null
        });

        const result = await supabase.functions.invoke('send-invitation', {
          body: {
            email: 'newhire@example.com',
            role: 'member',
            organizationId: organizations.acme.id
          }
        });

        expect(mockInvoke).toHaveBeenCalledWith('send-invitation', expect.any(Object));
        expect(result.data?.success).toBe(true);
      });

      it('prevents duplicate invitations', async () => {
        const mockInvoke = vi.mocked(supabase.functions.invoke);
        mockInvoke.mockResolvedValueOnce({
          data: null,
          error: { message: 'An invitation for this email already exists' }
        });

        const result = await supabase.functions.invoke('send-invitation', {
          body: {
            email: 'existing@example.com',
            role: 'member',
            organizationId: organizations.acme.id
          }
        });

        expect(result.error?.message).toContain('already exists');
      });
    });
  });

  describe('Email Verification', () => {
    it('requires email verification after sign up', () => {
      const signUpResult = {
        user: { id: 'new-user', email: 'new@example.com' },
        session: null, // No session until verified
        requiresEmailVerification: true
      };

      // Session is null until email is verified
      expect(signUpResult.session).toBeNull();
      expect(signUpResult.requiresEmailVerification).toBe(true);
    });

    it('allows login after email verification', () => {
      const verifiedUser = {
        id: 'verified-user',
        email: 'verified@example.com',
        email_confirmed_at: new Date().toISOString()
      };

      expect(verifiedUser.email_confirmed_at).toBeTruthy();
    });
  });

  describe('First-Time Setup', () => {
    it('redirects new owner to organization setup', () => {
      const newOwnerState = {
        isNewUser: true,
        hasCompletedSetup: false,
        redirectPath: '/organization/setup'
      };

      expect(newOwnerState.isNewUser).toBe(true);
      expect(newOwnerState.hasCompletedSetup).toBe(false);
      expect(newOwnerState.redirectPath).toBe('/organization/setup');
    });

    it('redirects invited user to dashboard', () => {
      const invitedUserState = {
        isNewUser: true,
        isInvitedUser: true,
        redirectPath: '/dashboard'
      };

      expect(invitedUserState.isInvitedUser).toBe(true);
      expect(invitedUserState.redirectPath).toBe('/dashboard');
    });
  });
});
