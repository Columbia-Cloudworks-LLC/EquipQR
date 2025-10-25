import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSession } from '@/hooks/useSession';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, CheckCircle, XCircle, Clock, Mail } from 'lucide-react';
import { toast } from 'sonner';

interface InvitationData {
  id: string;
  email: string;
  role: 'admin' | 'member';
  status: string;
  organization_name: string;
  inviter_name: string;
  message?: string;
  expires_at: string;
}

interface AcceptInvitationResponse {
  success: boolean;
  error?: string;
  organization_id?: string;
  organization_name?: string;
  role?: string;
}

const InvitationAccept = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { isLoading: sessionLoading, refreshSession } = useSession();
  const { user } = useAuth();
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInvitation = async () => {
      if (!token) {
        setError('Invalid invitation link');
        setLoading(false);
        return;
      }

      try {
        // Use the secure function to fetch invitation details
        const { data: invitationData, error: invitationError } = await supabase
          .rpc('get_invitation_by_token_secure', {
            p_token: token
          });

        if (invitationError) throw invitationError;

        if (!invitationData || invitationData.length === 0) {
          setError('Invitation not found or you do not have permission to access it');
          setLoading(false);
          return;
        }

        const invitation = invitationData[0];
        
        setInvitation({
          id: invitation.id,
          email: invitation.email,
          role: invitation.role as 'admin' | 'member',
          status: invitation.status,
          organization_name: invitation.organization_name || 'Unknown Organization',
          inviter_name: invitation.invited_by_name || 'Unknown User',
          message: invitation.message,
          expires_at: invitation.expires_at
        });

      } catch (err: unknown) {
        console.error('Error fetching invitation:', err);
        setError(err instanceof Error ? err.message : 'Failed to load invitation');
      } finally {
        setLoading(false);
      }
    };

    fetchInvitation();
  }, [token]);

  const handleAcceptInvitation = async () => {
    if (!invitation || !user || !token) return;

    setAccepting(true);
    
    try {
      // Use the atomic function to accept the invitation
      const { data, error } = await supabase.rpc('accept_invitation_atomic', {
        p_invitation_token: token
      });

      if (error) throw error;

      const result = data as unknown as AcceptInvitationResponse;
      
      if (!result?.success) {
        toast.error(result?.error || 'Failed to accept invitation');
        return;
      }

      toast.success(`Welcome to ${result.organization_name}!`);
      
      // Refresh session to update organization data
      await refreshSession();
      
      // Navigate to the organization page
      navigate('/dashboard/organization');

    } catch (err: unknown) {
      console.error('Error accepting invitation:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to accept invitation');
    } finally {
      setAccepting(false);
    }
  };

  const handleDeclineInvitation = async () => {
    if (!invitation) return;

    try {
      const { error } = await supabase
        .from('organization_invitations')
        .update({ 
          status: 'declined',
          declined_at: new Date().toISOString()
        })
        .eq('invitation_token', token);

      if (error) throw error;

      toast.success('Invitation declined');
      navigate('/');

    } catch (err: unknown) {
      console.error('Error declining invitation:', err);
      toast.error('Failed to decline invitation');
    }
  };

  if (loading || sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <Clock className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
            <p className="text-center text-muted-foreground mt-4">Loading invitation...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle>Invalid Invitation</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">
              {error || 'This invitation link is invalid or has expired.'}
            </p>
            <Button onClick={() => navigate('/')}>
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if invitation is expired
  const isExpired = new Date(invitation.expires_at) < new Date();
  const isAlreadyProcessed = invitation.status !== 'pending';

  if (isExpired || isAlreadyProcessed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <CardTitle>
              {isExpired ? 'Invitation Expired' : 'Invitation Already Processed'}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">
              {isExpired 
                ? 'This invitation has expired. Please request a new invitation from your organization administrator.'
                : `This invitation has already been ${invitation.status}.`
              }
            </p>
            <Button onClick={() => navigate('/')}>
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    // Store pending redirect back to this invitation URL
    const currentPath = window.location.pathname + window.location.search;
    sessionStorage.setItem('pendingRedirect', currentPath);

    // Build auth URL with signup tab and prefilled email
    const authParams = new URLSearchParams();
    authParams.set('tab', 'signup');
    if (invitation.email) authParams.set('email', invitation.email);

    navigate(`/auth?${authParams.toString()}`, { replace: true });
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <Building2 className="h-12 w-12 text-primary mx-auto mb-4" />
          <CardTitle className="text-2xl">Organization Invitation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">
              You're invited to join
            </h3>
            <p className="text-2xl font-bold text-primary mb-2">
              {invitation.organization_name}
            </p>
            <div className="flex items-center justify-center gap-2">
              <span className="text-muted-foreground">as a</span>
              <Badge variant="outline" className="capitalize">
                {invitation.role}
              </Badge>
            </div>
          </div>

          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-1">Invited by</p>
            <p className="font-medium">{invitation.inviter_name}</p>
            {invitation.message && (
              <>
                <p className="text-sm text-muted-foreground mt-3 mb-1">Personal message</p>
                <p className="text-sm italic bg-background p-3 rounded border-l-4 border-primary">
                  "{invitation.message}"
                </p>
              </>
            )}
          </div>

          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">What you'll get access to:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Equipment tracking and management</li>
              <li>• Work order creation and tracking</li>
              <li>• Team collaboration tools</li>
              <li>• QR code scanning for equipment</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <Button 
              onClick={handleAcceptInvitation}
              disabled={accepting}
              className="flex-1"
            >
              {accepting ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Accepting...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Accept Invitation
                </>
              )}
            </Button>
            <Button 
              variant="outline" 
              onClick={handleDeclineInvitation}
              disabled={accepting}
            >
              Decline
            </Button>
          </div>

          <div className="text-center text-xs text-muted-foreground">
            This invitation will expire on {new Date(invitation.expires_at).toLocaleDateString()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InvitationAccept;