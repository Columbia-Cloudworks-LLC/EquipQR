/** Payload shared by equipment and work-order inline note composers. */
export interface NoteSubmitPayload {
  content: string;
  images: File[];
  hoursWorked?: number;
  machineHours?: number;
  isPrivate?: boolean;
}

/** Result shape when a note create mutation uses the offline queue path. */
export type QueuedNoteCreateResult =
  | { queuedOffline: true; hadImages: boolean }
  | { queuedOffline: false; data?: unknown };

export function isQueuedNoteCreateResult(
  result: unknown,
): result is QueuedNoteCreateResult {
  return typeof result === 'object' && result !== null && 'queuedOffline' in result;
}
