import React, { useState } from 'react';
import { useUser } from '@/contexts/useUser';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAppToast } from '@/hooks/useAppToast';
import { useAuth } from '@/hooks/useAuth';
import SingleImageUpload from '@/components/common/SingleImageUpload';
import { uploadAvatar, deleteAvatar } from '@/services/profileService';
import { normalizeStoredObjectPath } from '@/services/imageUploadService';
import { useResolvedAvatarUrl } from '@/hooks/useResolvedAvatarUrl';
import { Save, Loader2 } from 'lucide-react';
import { trimmedAvatarPath, userDisplayInitials } from '@/utils/userDisplayInitials';
import { resolveEffectiveAvatarUrl } from '@/utils/resolveEffectiveAvatarUrl';

const ProfileSettings = () => {
  const { currentUser, setCurrentUser } = useUser();
  const { user: authUser } = useAuth();
  const { data: avatarDisplayUrl, isPending: isAvatarPending } = useResolvedAvatarUrl(currentUser?.avatar_url);
  const appToast = useAppToast();
  const [name, setName] = useState(currentUser?.name || '');
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    if (!currentUser) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ name })
        .eq('id', currentUser.id);

      if (error) throw error;

      setCurrentUser({
        ...currentUser,
        name
      });

      appToast.success({ description: 'Profile updated successfully' });
    } catch (error) {
      console.error('Error updating profile:', error);
      appToast.error({ description: 'Failed to update profile' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    if (!currentUser) return;
    const publicUrl = await uploadAvatar(currentUser.id, file);
    setCurrentUser({ ...currentUser, avatar_url: publicUrl });
  };

  const handleAvatarDelete = async () => {
    if (!currentUser) return;
    const avatarPath = trimmedAvatarPath(currentUser.avatar_url);
    const deletablePath = normalizeStoredObjectPath(avatarPath, 'user-avatars');
    if (!deletablePath) return;

    await deleteAvatar(currentUser.id, deletablePath);
    setCurrentUser({
      ...currentUser,
      avatar_url: resolveEffectiveAvatarUrl(null, authUser?.user_metadata),
    });
  };

  if (!currentUser) return null;

  const initials = userDisplayInitials(currentUser.name);
  const avatarPath = trimmedAvatarPath(currentUser.avatar_url);
  const deletableAvatarPath = normalizeStoredObjectPath(avatarPath, 'user-avatars');

  return (
    <>
      <SingleImageUpload
        currentImageUrl={avatarDisplayUrl}
        onUpload={handleAvatarUpload}
        onDelete={deletableAvatarPath ? handleAvatarDelete : undefined}
        maxSizeMB={5}
        disabled={isLoading}
        variant="avatar"
        avatarFallback={isAvatarPending && deletableAvatarPath ? '' : initials}
      />

      <div className="space-y-2">
        <Label htmlFor="name" className="text-sm font-medium">Display Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your display name"
          className="max-w-md"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm font-medium">Email</Label>
        <Input
          id="email"
          value={currentUser.email}
          disabled
          className="bg-muted max-w-md"
        />
        <p className="text-xs text-muted-foreground">
          Your email address cannot be changed here. Contact support if you need to update it.
        </p>
      </div>

      <div className="border-t pt-4 flex justify-end">
        <Button
          onClick={handleSave}
          size="sm"
          disabled={isLoading || name === currentUser.name}
          className="w-full sm:w-auto"
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {isLoading ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </>
  );
};

export default ProfileSettings;
