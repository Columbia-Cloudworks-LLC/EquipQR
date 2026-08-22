/**
 * Inventory RBAC grants: parts_managers / parts_consumers rows.
 *
 * Deliberately scoped away from Apex Construction — E2E RBAC specs
 * (e2e/pr-evidence/inventory-rbac.spec.ts) require Tom Technician to start
 * WITHOUT a grant so the deny path and the UI grant flow stay testable.
 */

import { ORGS } from '../reference-data';
import { renderSeedFile, uuidLiteral } from '../sql-builder';

export interface PartsRbacDomainResult {
  sql: string;
  summary: { partsManagers: number; partsConsumers: number };
}

export function generatePartsRbacDomain(): PartsRbacDomainResult {
  // Mike Mechanic manages Metro's parts room.
  const managerRows = [
    [
      uuidLiteral(ORGS.metro.staff[1].id),
      uuidLiteral(ORGS.metro.id),
      uuidLiteral(ORGS.metro.staff[0].id),
      `NOW() - INTERVAL '120 days'`,
    ].join(', '),
  ];

  // Multi Org User consumes parts at Industrial Rentals.
  const consumerRows = [
    [
      uuidLiteral(ORGS.industrial.staff[1].id),
      uuidLiteral(ORGS.industrial.id),
      uuidLiteral(ORGS.industrial.staff[0].id),
      `NOW() - INTERVAL '90 days'`,
    ].join(', '),
  ];

  const sql = renderSeedFile({
    fileTitle: 'Generated Seed Data - Inventory RBAC Grants',
    descriptionLines: [
      'Parts Manager: Mike Mechanic @ Metro. Parts Consumer: Multi Org User @ Industrial.',
      'Never grants Apex members — inventory-rbac E2E depends on the Apex deny path.',
    ],
    sections: [
      {
        title: 'PARTS MANAGERS',
        insert: {
          table: 'public.parts_managers',
          columns: ['user_id', 'organization_id', 'assigned_by', 'assigned_at'],
          rows: managerRows,
          conflictClause: 'ON CONFLICT (organization_id, user_id) DO NOTHING',
        },
      },
      {
        title: 'PARTS CONSUMERS',
        insert: {
          table: 'public.parts_consumers',
          columns: ['user_id', 'organization_id', 'assigned_by', 'assigned_at'],
          rows: consumerRows,
          conflictClause: 'ON CONFLICT (organization_id, user_id) DO NOTHING',
        },
      },
    ],
  });

  return { sql, summary: { partsManagers: managerRows.length, partsConsumers: consumerRows.length } };
}
