import { describe, expect, it } from 'vitest';
import { applySymptomChipToTitle, WORK_ORDER_SYMPTOM_CHIPS } from './symptomChips';

describe('applySymptomChipToTitle', () => {
  it('offers the six standard symptom / task chips', () => {
    expect(WORK_ORDER_SYMPTOM_CHIPS).toEqual([
      'Preventative Maintenance',
      'Hydraulic Leak',
      'No Start',
      'Electrical',
      'Track/Tire',
      'Safety Inspection',
    ]);
  });

  it('fills an empty title', () => {
    expect(applySymptomChipToTitle('', 'Hydraulic Leak')).toBe('Hydraulic Leak');
    expect(applySymptomChipToTitle('   ', 'No Start')).toBe('No Start');
  });

  it('appends to an existing title', () => {
    expect(applySymptomChipToTitle('Unit 12', 'Hydraulic Leak')).toBe('Unit 12, Hydraulic Leak');
    expect(applySymptomChipToTitle('Hydraulic Leak', 'Electrical')).toBe('Hydraulic Leak, Electrical');
  });

  it('does not repeat a chip that is already in the title', () => {
    expect(applySymptomChipToTitle('hydraulic leak on mast', 'Hydraulic Leak')).toBe('hydraulic leak on mast');
  });

  it('never grows the title past the 100 character limit', () => {
    const long = 'x'.repeat(95);
    expect(applySymptomChipToTitle(long, 'Safety Inspection')).toBe(long);
  });
});
