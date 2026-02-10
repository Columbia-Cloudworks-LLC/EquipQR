import { useEffect } from 'react';

const APP_NAME = 'EquipQR';

/**
 * Sets the document title for the current page.
 * Appends the app name suffix automatically.
 * Restores the default title on unmount.
 */
export function useDocumentTitle(title: string | undefined) {
  useEffect(() => {
    if (!title) return;

    const previousTitle = document.title;
    document.title = `${title} | ${APP_NAME}`;

    return () => {
      document.title = previousTitle;
    };
  }, [title]);
}
