import { useCallback, useState } from 'react';
import { toast } from 'sonner';

type UseWorkOrderDetailsNotesComposerParams = {
  notesSectionRef: React.RefObject<HTMLDivElement | null>;
  isOnline: boolean;
};

export function useWorkOrderDetailsNotesComposer({
  notesSectionRef,
  isOnline,
}: UseWorkOrderDetailsNotesComposerParams) {
  const [openNoteFormTrigger, setOpenNoteFormTrigger] = useState(0);
  const [openCaptureTrigger, setOpenCaptureTrigger] = useState(0);

  const openNotesComposer = useCallback(() => {
    setOpenNoteFormTrigger((prev) => prev + 1);
    setTimeout(() => {
      notesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }, [notesSectionRef]);

  const openPhotoCapture = useCallback(() => {
    if (!isOnline) {
      toast.error('Photos need a connection. Text notes can still be saved offline.');
      return;
    }
    setOpenNoteFormTrigger((prev) => prev + 1);
    setOpenCaptureTrigger((prev) => prev + 1);
    setTimeout(() => {
      notesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }, [isOnline, notesSectionRef]);

  return {
    openNoteFormTrigger,
    openCaptureTrigger,
    openNotesComposer,
    openPhotoCapture,
  };
}
