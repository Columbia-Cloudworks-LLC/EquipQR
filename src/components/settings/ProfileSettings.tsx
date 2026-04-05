import React, { useState } from 'react';
import { useUser } from '@/contexts/useUser';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAppToast } from '@/hooks/useAppToast';
import SingleImageUpload from '@/components/common/SingleImageUpload';
import { uploadAvatar, deleteAvatar } from '@/services/profileService';
import { Save, Loader2 } from 'lucide-react';

const ProfileSettings = () => {
  const { currentUser, setCurrentUser } = useUser();
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
    if (!currentUser?.avatar_url) return;
    await deleteAvatar(currentUser.id, currentUser.avatar_url);
    setCurrentUser({ ...currentUser, avatar_url: null });
  };

  if (!currentUser) return null;

  const initials = currentUser.name
    ? currentUser.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  return (
    <>
      <SingleImageUpload
        currentImageUrl={currentUser.avatar_url}
        onUpload={handleAvatarUpload}
        onDelete={handleAvatarDelete}
        maxSizeMB={5}
        disabled={isLoading}
        variant="avatar"
        avatarFallback={initials}
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
