import type { CapturedFieldValue } from '@/features/operator-check-ins/types/operatorChecklist';

export function flattenCapturedFields(
  operatorFieldValues: CapturedFieldValue[] | unknown,
  clientFieldValues: CapturedFieldValue[] | unknown,
  equipmentFieldValues: CapturedFieldValue[] | unknown,
): CapturedFieldValue[] {
  const all = [
    ...(Array.isArray(operatorFieldValues) ? operatorFieldValues : []),
    ...(Array.isArray(clientFieldValues) ? clientFieldValues : []),
    ...(Array.isArray(equipmentFieldValues) ? equipmentFieldValues : []),
  ];
  return all.filter(
    (field): field is CapturedFieldValue =>
      typeof field === 'object' &&
      field !== null &&
      typeof (field as CapturedFieldValue).field_id === 'string' &&
      typeof (field as CapturedFieldValue).label === 'string',
  );
}
