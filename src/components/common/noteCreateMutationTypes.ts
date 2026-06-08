export type NoteCreateMutationInput = {
  content: string;
  hoursWorked: number;
  isPrivate: boolean;
  images: File[];
  machineHours?: number;
};
