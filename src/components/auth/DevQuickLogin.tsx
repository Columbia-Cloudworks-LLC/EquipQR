import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Bug } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

/**
 * Test users from supabase/seed.sql
 * All use password: password123
 */
const DEV_USERS = [
  // Apex Construction Company
  { email: 'owner@apex.test', name: 'Alex Apex', role: 'Owner', org: 'Apex Construction' },
  { email: 'admin@apex.test', name: 'Amanda Admin', role: 'Admin', org: 'Apex Construction' },
  { email: 'tech@apex.test', name: 'Tom Technician', role: 'Member', org: 'Apex Construction' },
  // Metro Equipment Services
  { email: 'owner@metro.test', name: 'Marcus Metro', role: 'Owner', org: 'Metro Equipment' },
  { email: 'tech@metro.test', name: 'Mike Mechanic', role: 'Member', org: 'Metro Equipment' },
  // Valley Landscaping (Free tier)
  { email: 'owner@valley.test', name: 'Victor Valley', role: 'Owner', org: 'Valley Landscaping (Free)' },
  // Industrial Rentals Corp
  { email: 'owner@industrial.test', name: 'Irene Industrial', role: 'Owner', org: 'Industrial Rentals' },
  // Multi-org user
  { email: 'multi@equipqr.test', name: 'Multi Org User', role: 'Member', org: 'ALL Organizations' },
] as const;

const DEV_PASSWORD = 'password123';

// Group users by organization for the dropdown
const USER_GROUPS = [
  {
    label: 'Apex Construction (Premium)',
    users: DEV_USERS.filter((u) => u.org === 'Apex Construction'),
  },
  {
    label: 'Metro Equipment (Premium)',
    users: DEV_USERS.filter((u) => u.org === 'Metro Equipment'),
  },
  {
    label: 'Valley Landscaping (Free Tier)',
    users: DEV_USERS.filter((u) => u.org === 'Valley Landscaping (Free)'),
  },
  {
    label: 'Industrial Rentals (Premium)',
    users: DEV_USERS.filter((u) => u.org === 'Industrial Rentals'),
  },
  {
    label: 'Multi-Org Testing',
    users: DEV_USERS.filter((u) => u.org === 'ALL Organizations'),
  },
];

/**
 * Development-only quick login component.
 * Allows selecting a test user from a dropdown to instantly sign in.
 * This component is tree-shaken out of production builds.
 */
const DevQuickLogin: React.FC = () => {
  const { signIn } = useAuth();
  const [selectedEmail, setSelectedEmail] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only render in development mode
  if (!import.meta.env.DEV) {
    return null;
  }

  const handleQuickLogin = async () => {
    if (!selectedEmail || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const { error: signInError } = await signIn(selectedEmail, DEV_PASSWORD);
      if (signInError) {
        setError(signInError.message);
      }
    } catch (err) {
      setError('Failed to sign in. Make sure you have run `npx supabase db reset` to seed the database.');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedUser = DEV_USERS.find((u) => u.email === selectedEmail);

  return (
    <div className="rounded-lg border-2 border-dashed border-amber-400 bg-amber-50 p-4 dark:border-amber-600 dark:bg-amber-950/30">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-400">
        <Bug className="h-4 w-4" />
        <span>Dev Quick Login</span>
      </div>

      <div className="space-y-3">
        <Select value={selectedEmail} onValueChange={setSelectedEmail}>
          <SelectTrigger className="w-full bg-background">
            <SelectValue placeholder="Select a test account..." />
          </SelectTrigger>
          <SelectContent>
            {USER_GROUPS.map((group) => (
              <SelectGroup key={group.label}>
                <SelectLabel>{group.label}</SelectLabel>
                {group.users.map((user) => (
                  <SelectItem key={user.email} value={user.email}>
                    <span className="flex items-center gap-2">
                      <span className="font-medium">{user.name}</span>
                      <span className="text-muted-foreground">({user.role})</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>

        {selectedUser && (
          <p className="text-xs text-muted-foreground">
            Logging in as <strong>{selectedUser.email}</strong>
          </p>
        )}

        <Button
          type="button"
          variant="outline"
          className="w-full border-amber-400 hover:bg-amber-100 dark:border-amber-600 dark:hover:bg-amber-900/50"
          onClick={handleQuickLogin}
          disabled={!selectedEmail || isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            'Quick Login'
          )}
        </Button>

        {error && (
          <Alert variant="destructive" className="mt-2">
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
};

export default DevQuickLogin;
