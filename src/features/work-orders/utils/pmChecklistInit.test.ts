import { describe, it, expect } from 'vitest';
import { parsePMChecklistData } from './pmChecklistInit';

describe('parsePMChecklistData', () => {
  it('defaults required to true when the stored item omits it', () => {
    const { checklist } = parsePMChecklistData(
      [{ id: 'a', title: 'Hydraulic hoses', section: 'Hydraulics', condition: null }],
      'pm-test-key',
    );

    expect(checklist).toHaveLength(1);
    expect(checklist[0].required).toBe(true);
  });

  it('keeps an explicit required false', () => {
    const { checklist } = parsePMChecklistData(
      [{ id: 'a', title: 'Horn', section: 'Electrical', required: false, condition: 1 }],
      'pm-test-key',
    );

    expect(checklist[0].required).toBe(false);
  });

  it('carries photo_url through when present', () => {
    const { checklist } = parsePMChecklistData(
      [
        {
          id: 'a',
          title: 'Cylinder rod wiper',
          section: 'Hydraulics',
          required: true,
          condition: 3,
          photo_url: 'https://cdn.example.com/defects/wiper.jpg',
        },
        { id: 'b', title: 'Tires', section: 'Chassis', required: true, condition: 1 },
      ],
      'pm-test-key',
    );

    expect(checklist[0].photo_url).toBe('https://cdn.example.com/defects/wiper.jpg');
    expect(checklist[1].photo_url).toBeUndefined();
  });
});
