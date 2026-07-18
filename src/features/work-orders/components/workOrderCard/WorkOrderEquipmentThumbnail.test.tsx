import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WorkOrderEquipmentThumbnail } from './WorkOrderEquipmentThumbnail';

describe('WorkOrderEquipmentThumbnail', () => {
  it('renders an image for absolute URLs', () => {
    render(
      <WorkOrderEquipmentThumbnail
        imageUrl="https://example.supabase.co/storage/v1/object/sign/work-order-images/u/wo/a.jpg?token=x"
        equipmentName="CAT 320"
      />,
    );

    expect(screen.getByRole('img', { name: 'CAT 320 equipment image' })).toBeInTheDocument();
  });

  it('falls back to the icon for canonical storage paths instead of 404ing (#1086)', () => {
    render(
      <WorkOrderEquipmentThumbnail
        imageUrl="da1368a1/72245c3c/72462845/photo.jpg"
        equipmentName="CAT 320"
      />,
    );

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('falls back to the icon when no image URL is provided', () => {
    render(<WorkOrderEquipmentThumbnail equipmentName="CAT 320" />);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
