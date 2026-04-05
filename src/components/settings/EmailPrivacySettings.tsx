import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Mail, ChevronRight } from 'lucide-react';
import { SettingsToggleRow } from './SettingsToggleRow';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';

interface EmailPrivacySettingsProps {
  currentEmailPrivate?: boolean;
  onUpdate?: (emailPrivate: boolean) => void;
}

export const EmailPrivacySettings: React.FC<EmailPrivacySettingsProps> = ({
  currentEmailPrivate = false,
  onUpdate
}) => {
  const { user } = useAuth();
  const [emailPrivate, setEmailPrivate] = useState(currentEmailPrivate);
  const [isLoading, setIsLoading] = useState(false);

  const handleUpdatePrivacy = async (newEmailPrivate: boolean) => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ email_private: newEmailPrivate })
        .eq('id', user.id);

      if (error) throw error;

      setEmailPrivate(newEmailPrivate);
      onUpdate?.(newEmailPrivate);

      toast.success(
        newEmailPrivate
          ? 'Email address is now private from organization members'
          : 'Email address is now visible to organization members'
      );
    } catch (error) {
      console.error('Failed to update email privacy:', error);
      toast.error('Failed to update email privacy settings');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <SettingsToggleRow
        id="email-private"
        label="Hide email from organization members"
        description="Organization owners and admins can still see your email"
        checked={emailPrivate}
        onCheckedChange={handleUpdatePrivacy}
        loading={isLoading}
        icon={<Mail className="h-4 w-4" />}
      />

      <Collapsible>
        <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group">
          <ChevronRight className="h-4 w-4 transition-transform group-data-[state=open]:rotate-90" />
          Visibility settings
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-2 pl-6 border-l-2 border-muted text-xs text-muted-foreground space-y-1">
            <p>You can always see your own email</p>
            <p>Organization owners/admins can always see your email</p>
            <p>
              {emailPrivate
                ? 'Regular organization members cannot see your email'
                : 'Organization members can see your email'}
            </p>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
