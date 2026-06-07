import type { ReactNode } from 'react';

export interface PrivacyDataCategoryRow {
  category: string;
  dataPoints: ReactNode;
}

interface PrivacyDataCategoryTableProps {
  rows: PrivacyDataCategoryRow[];
}

/** Two-column Category / Data Points table used in Privacy Policy Sections 2 and 3. */
export function PrivacyDataCategoryTable({ rows }: PrivacyDataCategoryTableProps) {
  return (
    <div className="overflow-x-auto">
      <table>
        <thead>
          <tr>
            <th className="whitespace-nowrap">Category</th>
            <th>Data Points Collected</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.category}>
              <td className="whitespace-nowrap font-medium">{row.category}</td>
              <td>{row.dataPoints}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
