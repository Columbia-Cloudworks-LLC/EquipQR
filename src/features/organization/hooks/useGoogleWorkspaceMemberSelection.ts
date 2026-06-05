import { useCallback } from 'react';

export function useGoogleWorkspaceMemberSelection(
  setSelectedEmails: React.Dispatch<React.SetStateAction<Set<string>>>,
  setAdminEmails: React.Dispatch<React.SetStateAction<Set<string>>>,
) {
  const toggleEmail = useCallback(
    (email: string, checked: boolean) => {
      setSelectedEmails((prev) => {
        const next = new Set(prev);
        if (checked) {
          next.add(email);
        } else {
          next.delete(email);
        }
        return next;
      });

      if (!checked) {
        setAdminEmails((prev) => {
          const next = new Set(prev);
          next.delete(email);
          return next;
        });
      }
    },
    [setAdminEmails, setSelectedEmails],
  );

  const toggleAdmin = useCallback(
    (email: string, checked: boolean) => {
      setAdminEmails((prev) => {
        const next = new Set(prev);
        if (checked) {
          next.add(email);
        } else {
          next.delete(email);
        }
        return next;
      });
    },
    [setAdminEmails],
  );

  const toggleSelectAll = useCallback(
    (checked: boolean, availableEmails: string[]) => {
      if (checked) {
        const newSelectedEmails = new Set(availableEmails);
        setSelectedEmails(newSelectedEmails);
        setAdminEmails((prev) => {
          const reconciled = new Set<string>();
          prev.forEach((email) => {
            if (newSelectedEmails.has(email)) {
              reconciled.add(email);
            }
          });
          return reconciled;
        });
      } else {
        setSelectedEmails(new Set());
        setAdminEmails(new Set());
      }
    },
    [setAdminEmails, setSelectedEmails],
  );

  const clearSelection = useCallback(() => {
    setSelectedEmails(new Set());
    setAdminEmails(new Set());
  }, [setAdminEmails, setSelectedEmails]);

  return { toggleEmail, toggleAdmin, toggleSelectAll, clearSelection };
}
