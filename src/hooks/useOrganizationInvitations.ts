import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface OrganizationInvitation {
  id: string;
  email: string;
  role: 'admin' | 'member';
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  message?: string;
  invitedBy: string;
  createdAt: string;
  expiresAt: string;
  acceptedAt?: string;
  inviterName?: string;
  slot_reserved?: boolean;
  slot_purchase_id?: string;
  declined_at?: string;
  expired_at?: string;
}

export interface CreateInvitationData {
  email: string;
  role: 'admin' | 'member';
  message?: string;
  reserveSlot?: boolean;
}

export const useOrganizationInvitations = (organizationId: string) => {
  return useQuery({
    queryKey: ['organization-invitations', organizationId],
    queryFn: async (): Promise<OrganizationInvitation[]> => {
      if (!organizationId) return [];

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('User not authenticated');

      const startTime = performance.now();
      
      try {
        // Use the atomic function that eliminates circular dependencies
        const { data: invitationsData, error } = await supabase.rpc('get_invitations_atomic', {
          user_uuid: userData.user.id,
          org_id: organizationId
        });

        if (error) {
          console.error('Error fetching invitations:', error);
          throw error;
        }

        // Get inviter name
        const { data: profileData } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', userData.user.id)
          .single();
        
        const inviterName = profileData?.name || 'You';
        const executionTime = performance.now() - startTime;

        // Log performance
        try {
          await supabase.rpc('log_invitation_performance', {
            function_name: 'get_invitations',
            execution_time_ms: executionTime,
            success: true
          });
        } catch {} // Silently fail

        return (invitationsData || []).map(invitation => ({
          id: invitation.id,
          email: invitation.email,
          role: invitation.role as 'admin' | 'member',
          status: invitation.status as 'pending' | 'accepted' | 'declined' | 'expired',
          message: invitation.message || undefined,
          invitedBy: userData.user.id,
          createdAt: invitation.created_at,
          expiresAt: invitation.expires_at,
          acceptedAt: invitation.accepted_at || undefined,
          inviterName: inviterName,
          slot_reserved: invitation.slot_reserved || false,
          slot_purchase_id: invitation.slot_purchase_id || undefined,
          declined_at: invitation.declined_at || undefined,
          expired_at: invitation.expired_at || undefined
        }));
      } catch (error: any) {
        const executionTime = performance.now() - startTime;
        
        // Log performance error
        try {
          await supabase.rpc('log_invitation_performance', {
            function_name: 'get_invitations',
            execution_time_ms: executionTime,
            success: false,
            error_message: error.message
          });
        } catch {} // Silently fail
        
        throw error;
      }
    },
    enabled: !!organizationId,
    staleTime: 30 * 1000, // 30 seconds
  });
};

// Optimized invitation creation without retry logic or client-side validation

export const useCreateInvitation = (organizationId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestData: CreateInvitationData) => {
      if (!organizationId) throw new Error('No organization ID provided');

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('User not authenticated');

      const startTime = performance.now();
      
      try {
        // Use the atomic function that eliminates circular dependencies
        console.log(`[INVITATION] Creating invitation for ${requestData.email} in org ${organizationId}`);
        
        const { data: invitationId, error } = await supabase.rpc('create_invitation_atomic', {
          p_organization_id: organizationId,
          p_email: requestData.email.toLowerCase().trim(),
          p_role: requestData.role,
          p_message: requestData.message || null,
          p_invited_by: userData.user.id
        });

        if (error) {
          console.error(`[INVITATION] Creation error:`, error);
          throw error;
        }

        const executionTime = performance.now() - startTime;
        console.log(`[INVITATION] Creation took ${executionTime.toFixed(2)}ms`);

        // Log performance success
        try {
          await supabase.rpc('log_invitation_performance', {
            function_name: 'create_invitation',
            execution_time_ms: executionTime,
            success: true
          });
        } catch {} // Silently fail

        // Get the created invitation data for return
        const { data: createdRows, error: fetchError } = await supabase
          .from('organization_invitations')
          .select('id, organization_id, email, role, status, expires_at, accepted_at, created_at, invitation_token')
          .eq('id', invitationId)
          .eq('organization_id', organizationId);

        const createdInvitation = Array.isArray(createdRows) ? createdRows[0] : createdRows;

        if (fetchError) {
          console.error(`[INVITATION] Fetch created invitation error:`, fetchError);
          throw fetchError;
        }

        // Reserve slot if requested (non-blocking)
        if (requestData.reserveSlot) {
          (async () => {
            try {
              const { error: reserveError } = await supabase.rpc('reserve_slot_for_invitation', {
                org_id: organizationId,
                invitation_id: createdInvitation.id
              });
              
              if (reserveError) {
                console.warn('[INVITATION] Failed to reserve slot:', reserveError);
              }
            } catch (reserveError) {
              console.warn('[INVITATION] Slot reservation error:', reserveError);
            }
          })();
        }

        // Send invitation email via edge function (non-blocking)
        setTimeout(async () => {
          try {
            // Get profile and organization data for email
            const [profileResult, organizationResult] = await Promise.all([
              supabase.from('profiles').select('name').eq('id', userData.user.id).single(),
              supabase.from('organizations').select('name').eq('id', organizationId).single()
            ]);

            const { error: emailError } = await supabase.functions.invoke('send-invitation-email', {
              body: {
                invitationId: createdInvitation.id,
                email: requestData.email.toLowerCase().trim(),
                role: requestData.role,
                organizationName: organizationResult.data?.name || 'Your Organization',
                inviterName: profileResult.data?.name || 'Team Member',
                message: requestData.message
              }
            });

            if (emailError) {
              console.error('[INVITATION] Failed to send invitation email:', emailError);
            } else {
              console.log(`[INVITATION] Email sent successfully for ${requestData.email}`);
            }
          } catch (emailError) {
            console.error('[INVITATION] Error calling email function:', emailError);
          }
        }, 0);

        console.log(`[INVITATION] Successfully created invitation ${createdInvitation.id} for ${requestData.email}`);
        return createdInvitation;
        
      } catch (error: any) {
        const executionTime = performance.now() - startTime;
        
        // Log performance error
        try {
          await supabase.rpc('log_invitation_performance', {
            function_name: 'create_invitation',
            execution_time_ms: executionTime,
            success: false,
            error_message: error.message
          });
        } catch {} // Silently fail
        
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-invitations', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['slot-availability', organizationId] });
      toast.success('Invitation sent successfully');
    },
    onError: (error: any) => {
      console.error('Error creating invitation:', error);
      
      // Handle specific error types from the optimized function
      if (error.message?.includes('PERMISSION_DENIED')) {
        toast.error('You do not have permission to invite members');
      } else if (error.message?.includes('DUPLICATE_INVITATION')) {
        toast.error('An invitation to this email already exists');
      } else if (error.message?.includes('INVITATION_ERROR')) {
        toast.error('Failed to send invitation - please try again');
      } else {
        toast.error('Failed to send invitation');
      }
    }
  });
};

export const useResendInvitation = (organizationId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitationId: string) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('User not authenticated');

      // Check if user can manage this invitation using atomic function
      const { data: canManage } = await supabase.rpc('can_manage_invitation_atomic', {
        user_uuid: userData.user.id,
        invitation_id: invitationId
      });

      if (!canManage) {
        throw new Error('You do not have permission to resend this invitation');
      }

      const { data, error } = await supabase
        .from('organization_invitations')
        .update({
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
          status: 'pending'
        })
        .eq('id', invitationId)
        .eq('organization_id', organizationId)
        .select('id, organization_id, email, role, status, expires_at, accepted_at, updated_at');

      const updatedInvitation = Array.isArray(data) ? data[0] : data;

      if (error) throw error;
      return updatedInvitation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-invitations', organizationId] });
      toast.success('Invitation resent successfully');
    },
    onError: (error) => {
      console.error('Error resending invitation:', error);
      toast.error('Failed to resend invitation');
    }
  });
};

export const useCancelInvitation = (organizationId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitationId: string) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('User not authenticated');

      // Check if user can manage this invitation using atomic function
      const { data: canManage } = await supabase.rpc('can_manage_invitation_atomic', {
        user_uuid: userData.user.id,
        invitation_id: invitationId
      });

      if (!canManage) {
        throw new Error('You do not have permission to cancel this invitation');
      }

      const { data, error } = await supabase
        .from('organization_invitations')
        .update({ status: 'expired', expired_at: new Date().toISOString() })
        .eq('id', invitationId)
        .eq('organization_id', organizationId)
        .select('id, organization_id, email, role, status, expired_at, updated_at');

      const cancelledInvitation = Array.isArray(data) ? data[0] : data;

      if (error) throw error;
      return cancelledInvitation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-invitations', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['slot-availability', organizationId] });
      toast.success('Invitation cancelled successfully');
    },
    onError: (error) => {
      console.error('Error cancelling invitation:', error);
      toast.error('Failed to cancel invitation');
    }
  });
};

// Direct invitation creation utility using atomic function
export const createInvitationDirectly = async (
  organizationId: string,
  email: string,
  role: 'admin' | 'member',
  message?: string
): Promise<string> => {
  const { data: invitationId, error } = await supabase.rpc('create_invitation_atomic', {
    p_organization_id: organizationId,
    p_email: email.toLowerCase().trim(),
    p_role: role,
    p_message: message || null
  });

  if (error) {
    throw new Error(`Failed to create invitation: ${error.message}`);
  }

  return invitationId;
};
