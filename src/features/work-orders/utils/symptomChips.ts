export const WORK_ORDER_SYMPTOM_CHIPS = [
  'Preventative Maintenance',
  'Hydraulic Leak',
  'No Start',
  'Electrical',
  'Track/Tire',
  'Safety Inspection',
] as const;

export type WorkOrderSymptomChip = (typeof WORK_ORDER_SYMPTOM_CHIPS)[number];

const TITLE_MAX_LENGTH = 100;

/**
 * Title after tapping a chip: fills an empty title, otherwise appends the chip
 * once. A chip already in the title is left alone so double taps do not repeat it.
 */
export function applySymptomChipToTitle(title: string, chip: string): string {
  const current = title.trim();
  if (!current) return chip;
  if (current.toLowerCase().includes(chip.toLowerCase())) return current;
  const next = `${current}, ${chip}`;
  return next.length > TITLE_MAX_LENGTH ? current : next;
}
