import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { DataTable, type Column } from '../data-table';

interface Row extends Record<string, unknown> {
  id: string;
  name: string;
  serial: string;
}

const sampleData: Row[] = [
  { id: 'r1', name: 'Forklift A', serial: 'SN-001' },
  { id: 'r2', name: 'Excavator B', serial: 'SN-002' },
];

const sampleColumns: Column<Row>[] = [
  { key: 'name', title: 'Name' },
  { key: 'serial', title: 'Serial', mono: true },
];

describe('DataTable', () => {
  describe('density', () => {
    it('uses comfortable padding by default (no compact override)', () => {
      render(<DataTable data={sampleData} columns={sampleColumns} />);
      const cells = screen.getAllByRole('cell');
      const firstBodyCell = cells[0];
      expect(firstBodyCell.className).not.toContain('py-1.5');
      expect(firstBodyCell.className).not.toContain('px-2');
    });

    it('emits compact padding (py-1.5 px-2) on TableCell when density="compact"', () => {
      render(<DataTable data={sampleData} columns={sampleColumns} density="compact" />);
      const cells = screen.getAllByRole('cell');
      const firstBodyCell = cells[0];
      expect(firstBodyCell.className).toContain('py-1.5');
      expect(firstBodyCell.className).toContain('px-2');
    });

    it('shrinks header height (h-9 px-2) when density="compact"', () => {
      render(<DataTable data={sampleData} columns={sampleColumns} density="compact" />);
      const headers = screen.getAllByRole('columnheader');
      expect(headers[0].className).toContain('h-9');
      expect(headers[0].className).toContain('px-2');
    });
  });

  describe('stickyHeader', () => {
    it('adds sticky top-0 to the table header when stickyHeader is true', () => {
      const { container } = render(
        <DataTable data={sampleData} columns={sampleColumns} stickyHeader />,
      );
      const thead = container.querySelector('thead');
      expect(thead).not.toBeNull();
      expect(thead!.className).toContain('sticky');
      expect(thead!.className).toContain('top-0');
    });

    it('does not add sticky positioning by default', () => {
      const { container } = render(
        <DataTable data={sampleData} columns={sampleColumns} />,
      );
      const thead = container.querySelector('thead');
      expect(thead).not.toBeNull();
      expect(thead!.className).not.toContain('sticky');
    });
  });

  describe('freezeFirstColumn', () => {
    it('adds sticky left-0 to the first body cell when freezeFirstColumn is true', () => {
      render(<DataTable data={sampleData} columns={sampleColumns} freezeFirstColumn />);
      const cells = screen.getAllByRole('cell');
      const firstBodyCell = cells[0];
      expect(firstBodyCell.className).toContain('sticky');
      expect(firstBodyCell.className).toContain('left-0');
    });

    it('adds sticky left-0 to the first header cell when freezeFirstColumn is true', () => {
      render(<DataTable data={sampleData} columns={sampleColumns} freezeFirstColumn />);
      const headers = screen.getAllByRole('columnheader');
      expect(headers[0].className).toContain('sticky');
      expect(headers[0].className).toContain('left-0');
    });

    it('does not freeze cells by default', () => {
      render(<DataTable data={sampleData} columns={sampleColumns} />);
      const headers = screen.getAllByRole('columnheader');
      expect(headers[0].className).not.toContain('sticky');
    });
  });

  describe('mono columns', () => {
    it('adds font-mono to a mono column header and body cell', () => {
      render(<DataTable data={sampleData} columns={sampleColumns} />);
      const headers = screen.getAllByRole('columnheader');
      const monoHeader = headers[1]; // serial column
      expect(monoHeader.className).toContain('font-mono');
      expect(monoHeader.className).toContain('tabular-nums');

      const cells = screen.getAllByRole('cell');
      const firstSerialCell = cells[1]; // second cell of first row
      expect(firstSerialCell.className).toContain('font-mono');
      expect(firstSerialCell.className).toContain('tabular-nums');
    });

    it('does not apply font-mono to columns without mono flag', () => {
      render(<DataTable data={sampleData} columns={sampleColumns} />);
      const headers = screen.getAllByRole('columnheader');
      const nameHeader = headers[0];
      expect(nameHeader.className).not.toContain('font-mono');
    });
  });

  describe('rendering basics', () => {
    it('renders all rows and cell values', () => {
      render(<DataTable data={sampleData} columns={sampleColumns} />);
      expect(screen.getByText('Forklift A')).toBeInTheDocument();
      expect(screen.getByText('Excavator B')).toBeInTheDocument();
      expect(screen.getByText('SN-001')).toBeInTheDocument();
      expect(screen.getByText('SN-002')).toBeInTheDocument();
    });

    it('renders the empty message when data is empty', () => {
      render(
        <DataTable
          data={[]}
          columns={sampleColumns}
          emptyMessage="Nothing here yet."
        />,
      );
      expect(screen.getByText('Nothing here yet.')).toBeInTheDocument();
    });

    it('renders a sortable header as a button with the sort icon', () => {
      const sortableColumns: Column<Row>[] = [
        { key: 'name', title: 'Name', sortable: true },
        { key: 'serial', title: 'Serial' },
      ];
      render(
        <DataTable
          data={sampleData}
          columns={sortableColumns}
          sorting={{ sortBy: 'name', sortOrder: 'asc', onSortChange: () => {} }}
        />,
      );
      const headers = screen.getAllByRole('columnheader');
      const sortButton = within(headers[0]).getByRole('button', { name: /name/i });
      expect(sortButton).toBeInTheDocument();
      expect(headers[0]).toHaveAttribute('aria-sort', 'ascending');
    });
  });
});
