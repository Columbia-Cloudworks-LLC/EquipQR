/**
 * Volume equipment generator: extra fleet rows per org so lists, maps, and
 * work-order pickers exercise realistic volume beyond the durable-core fixtures.
 *
 * Naming/location patterns follow supabase/seeds/07_equipment.sql:
 * "City, ST" location text, sparse working-hours, active/maintenance mix.
 */

import { SeededRng } from '../rng';
import { ORGS, ORG_KEYS, ORG_FLEET_MODELS, UUID_PREFIXES, type OrgKey } from '../reference-data';
import { deterministicUuid, escapeSql, jsonbLiteral, renderSeedFile, uuidLiteral } from '../sql-builder';

const BASE_EQUIPMENT_PER_ORG = 8;

const MANUFACTURER_BY_PREFIX: Record<string, string> = {
  CAT: 'Caterpillar',
  Komatsu: 'Komatsu',
  Hitachi: 'Hitachi',
  John: 'John Deere',
  Bobcat: 'Bobcat',
  Kubota: 'Kubota',
  JLG: 'JLG',
  Genie: 'Genie',
  Skyjack: 'Skyjack',
  Toyota: 'Toyota',
  Hyster: 'Hyster',
  Crown: 'Crown',
  Raymond: 'Raymond',
  Yale: 'Yale',
  Volvo: 'Volvo',
  Stihl: 'Stihl',
  Husqvarna: 'Husqvarna',
};

export interface GeneratedEquipment {
  id: string;
  orgKey: OrgKey;
  organizationId: string;
  teamId: string | null;
  name: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  status: 'active' | 'maintenance' | 'inactive';
  location: string;
  installationDate: string;
  workingHours: number;
}

export interface EquipmentDomainResult {
  sql: string;
  equipment: GeneratedEquipment[];
  summary: { equipment: number };
}

function pad(n: number, width: number): string {
  return n.toString().padStart(width, '0');
}

export function generateEquipmentDomain(scale: number): EquipmentDomainResult {
  const rng = new SeededRng(22345);
  const equipment: GeneratedEquipment[] = [];
  let counter = 100;

  for (const orgKey of ORG_KEYS) {
    const org = ORGS[orgKey];
    const count = BASE_EQUIPMENT_PER_ORG * scale;
    const fleets = ORG_FLEET_MODELS[orgKey];

    for (let i = 0; i < count; i++) {
      const modelName = rng.choice(rng.choice(fleets));
      const [prefix, ...modelParts] = modelName.split(' ');
      const manufacturer = MANUFACTURER_BY_PREFIX[prefix] ?? prefix;
      const model = modelParts.join(' ') || modelName;

      const statusRoll = rng.next();
      const status: GeneratedEquipment['status'] =
        statusRoll < 0.78 ? 'active' : statusRoll < 0.94 ? 'maintenance' : 'inactive';

      const year = rng.int(2018, 2024);
      const unitNumber = counter;
      const serial = `GEN-${prefix.substring(0, 3).toUpperCase()}${year}${pad(unitNumber, 4)}`;

      equipment.push({
        id: deterministicUuid(UUID_PREFIXES.equipment, counter),
        orgKey,
        organizationId: org.id,
        // ~20% unassigned to keep the "unassigned equipment" dashboard scope populated.
        teamId: rng.next() < 0.2 ? null : rng.choice(org.teams).id,
        name: `${modelName} Unit ${pad(unitNumber, 3)}`,
        manufacturer,
        model,
        serialNumber: serial,
        status,
        location: rng.choice(org.cities),
        installationDate: `${year}-${pad(rng.int(1, 12), 2)}-${pad(rng.int(1, 28), 2)}`,
        workingHours: rng.int(50, 6000) + rng.int(0, 9) / 10,
      });
      counter++;
    }
  }

  const rows = equipment.map((eq) =>
    [
      uuidLiteral(eq.id),
      uuidLiteral(eq.organizationId),
      uuidLiteral(eq.teamId),
      escapeSql(eq.name),
      escapeSql(eq.manufacturer),
      escapeSql(eq.model),
      escapeSql(eq.serialNumber),
      `'${eq.status}'::equipment_status`,
      escapeSql(eq.location),
      escapeSql(eq.installationDate),
      String(eq.workingHours),
      jsonbLiteral({ fleet_source: 'generated' }),
      'NULL',
      `NOW() - INTERVAL '${rng.int(60, 400)} days'`,
      `NOW() - INTERVAL '${rng.int(1, 59)} days'`,
    ].join(', '),
  );

  const sql = renderSeedFile({
    fileTitle: 'Generated Seed Data - Volume Equipment Fleet',
    descriptionLines: [
      `Scale: ${scale} (${equipment.length} equipment rows across 4 orgs)`,
      'Serial numbers use the GEN- prefix so generated assets are easy to spot.',
    ],
    sections: [
      {
        title: 'EQUIPMENT',
        insert: {
          table: 'public.equipment',
          columns: [
            'id', 'organization_id', 'team_id', 'name', 'manufacturer', 'model', 'serial_number',
            'status', 'location', 'installation_date', 'working_hours', 'custom_attributes',
            'last_known_location', 'created_at', 'updated_at',
          ],
          rows,
        },
      },
    ],
  });

  return { sql, equipment, summary: { equipment: equipment.length } };
}
