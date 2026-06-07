import {
  ccpaPersonalInfoCategories,
  ccpaRetentionPeriods,
} from '@/pages/legal/privacy/data/ccpaTablesData';

export function CcpaPersonalInfoCategoriesTable() {
  return (
    <div className="overflow-x-auto">
      <table>
        <thead>
          <tr>
            <th>Category</th>
            <th>Examples</th>
            <th>Collected</th>
          </tr>
        </thead>
        <tbody>
          {ccpaPersonalInfoCategories.map((row) => (
            <tr key={row.category}>
              <td className="font-medium">{row.category}</td>
              <td>{row.examples}</td>
              <td>{row.collected}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CcpaRetentionPeriodsTable() {
  return (
    <div className="overflow-x-auto">
      <table>
        <thead>
          <tr>
            <th>Data Category</th>
            <th>Retention Period</th>
          </tr>
        </thead>
        <tbody>
          {ccpaRetentionPeriods.map((row) => (
            <tr key={row.dataCategory}>
              <td>{row.dataCategory}</td>
              <td>{row.retentionPeriod}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
