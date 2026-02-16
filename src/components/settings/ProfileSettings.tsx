import React, { useState } from 'react';
import { useUser } from '@/contexts/useUser';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAppToast } from '@/hooks/useAppToast';
import SingleImageUpload from '@/components/common/SingleImageUpload';
import { uploadAvatar, deleteAvatar } from '@/services/profileService';

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

      // Update the user context
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Information</CardTitle>
        <CardDescription>
          Update your display name, avatar, and other profile details.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <SingleImageUpload
          currentImageUrl={currentUser.avatar_url}
          onUpload={handleAvatarUpload}
          onDelete={handleAvatarDelete}
          maxSizeMB={5}
          disabled={isLoading}
          label="Profile Avatar"
          helpText="Upload a profile photo. It will be displayed next to your name."
          previewClassName="w-24 h-24 rounded-full object-cover"
        />

        <div className="space-y-2">
          <Label htmlFor="name">Display Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your display name"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            value={currentUser.email}
            disabled
            className="bg-muted"
          />
          <p className="text-sm text-muted-foreground">
            Your email address cannot be changed here. Contact support if you need to update it.
          </p>
        </div>

        <Button 
          onClick={handleSave} 
          disabled={isLoading || name === currentUser.name}
        >
          {isLoading ? 'Saving...' : 'Save Changes'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default ProfileSettings;