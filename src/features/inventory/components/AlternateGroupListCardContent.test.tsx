import React from 'react';
import { render, screen } from '@vitest-harness/utils/test-utils';
import { describe, it, expect } from 'vitest';
import { AlternateGroupListCardContent } from './AlternateGroupListCardContent';

describe('AlternateGroupListCardContent', () => {
  it('renders a scrollable part list when members exist', () => {
    render(
      <AlternateGroupListCardContent
        description="Interchangeable compressors"
        notes="Cross-reference notes"
        memberSummaries={[
          { id: 'm-1', name: 'A/C Compressor - OEM', sku: 'AC-1001' },
          { id: 'm-2', name: 'A/C Compressor - Aftermarket', sku: 'AC-2002' },
          { id: 'm-3', name: 'A/C Compressor - Rebuilt', sku: 'AC-3003' },
          { id: 'm-4', name: 'A/C Compressor - Generic', sku: 'AC-4004' },
        ]}
      />,
    );

    expect(screen.getByLabelText('Parts in group')).toBeInTheDocument();
    expect(screen.getByText('A/C Compressor - OEM')).toBeInTheDocument();
    expect(screen.getByText('AC-1001')).toBeInTheDocument();
    expect(screen.getByText('A/C Compressor - Generic')).toBeInTheDocument();
    expect(screen.queryByText('Interchangeable compressors')).not.toBeInTheDocument();
  });

  it('shows description when the group has no members', () => {
    render(
      <AlternateGroupListCardContent
        description="Interchangeable compressors"
        notes={null}
        memberSummaries={[]}
      />,
    );

    expect(screen.getByText('Interchangeable compressors')).toBeInTheDocument();
    expect(screen.queryByLabelText('Parts in group')).not.toBeInTheDocument();
  });

  it('shows placeholder when there are no members or description', () => {
    render(
      <AlternateGroupListCardContent
        description={null}
        notes={null}
        memberSummaries={undefined}
      />,
    );

    expect(screen.getByText('No description')).toBeInTheDocument();
  });
});
