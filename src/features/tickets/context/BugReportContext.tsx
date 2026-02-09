import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import SubmitTicketDialog from '../components/SubmitTicketDialog';

interface BugReportContextValue {
  openBugReport: () => void;
}

const BugReportContext = createContext<BugReportContextValue | null>(null);

/**
 * Provider that renders the global SubmitTicketDialog and exposes
 * `openBugReport()` to any descendant via `useBugReport()`.
 *
 * Also registers a global keyboard shortcut (Ctrl+Shift+B / Cmd+Shift+B)
 * so users can invoke bug reporting from any page.
 */
export const BugReportProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [open, setOpen] = useState(false);

  const openBugReport = useCallback(() => setOpen(true), []);

  // Global keyboard shortcut: Ctrl+Shift+B (or Cmd+Shift+B on Mac)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        openBugReport();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openBugReport]);

  return (
    <BugReportContext.Provider value={{ openBugReport }}>
      {children}
      <SubmitTicketDialog open={open} onOpenChange={setOpen} />
    </BugReportContext.Provider>
  );
};

/**
 * Hook to access the global bug report dialog.
 * Must be used within a `<BugReportProvider>`.
 */
export function useBugReport(): BugReportContextValue {
  const ctx = useContext(BugReportContext);
  if (!ctx) {
    throw new Error('useBugReport must be used within a <BugReportProvider>');
  }
  return ctx;
}
