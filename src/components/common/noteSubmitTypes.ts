/** Payload shared by equipment and work-order inline note composers. */
export interface NoteSubmitPayload {
  content: string;
  images: File[];
  machineHours?: number;
  isPrivate?: boolean;
}

/** Result shape when a note create mutation uses the offline queue path. */
export type QueuedNoteCreateResult =
  | { queuedOffline: true; hadImages: boolean }
  | { queuedOffline: false; data?: unknown };
