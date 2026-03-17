import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/hooks/useAuth';
import { useIdleTimeout } from '@/hooks/useIdleTimeout';

export default function IdleSessionTimeoutGuard() {
  const { user, signOut } = useAuth();

  const { isWarningOpen, secondsRemaining, staySignedIn, signOutNow } = useIdleTimeout({
    enabled: !!user,
    onTimeout: async () => {
      await signOut();
      window.location.assign('/auth');
    },
  });

  return (
    <AlertDialog open={isWarningOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Session expiring soon</AlertDialogTitle>
          <AlertDialogDescription>
            You have been inactive. For security, you will be signed out in {secondsRemaining} second
            {secondsRemaining === 1 ? '' : 's'} unless you continue your session.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={staySignedIn}>Stay signed in</AlertDialogCancel>
          <AlertDialogAction onClick={() => void signOutNow()}>Sign out now</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
