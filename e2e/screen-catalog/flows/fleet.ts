import { seedEquipment } from '../../user/shared/seed-data';
import type { CatalogFlow, CatalogScreen } from '../types';

const LIST = ['src/features/equipment/pages/Equipment.tsx'];
const DETAIL = ['src/features/equipment/pages/EquipmentDetails.tsx'];
const CAT320 = `/dashboard/equipment/${seedEquipment.cat320.id}`;

const detailTab = (tab: string, description: string, personas?: CatalogScreen['personas']): CatalogScreen => ({
  id: `detail-tab-${tab.toLowerCase().replace(/[^a-z]+/g, '-')}`,
  title: `Equipment detail: ${tab} tab`,
  description,
  route: CAT320,
  steps: [{ action: 'click', target: { role: 'tab', name: tab, exact: true } }],
  capture: 'page',
  personas,
  sources: DETAIL,
});

export const equipmentFlow: CatalogFlow = {
  id: 'equipment',
  title: 'Equipment',
  area: 'Fleet',
  description:
    'Browse the fleet, open an asset and work through its tabs; add equipment, show QR codes and log hours.',
  personas: ['owner', 'technician'],
  screens: [
    {
      id: 'list',
      title: 'Equipment list',
      description: 'Paginated equipment cards with QR and quick work-order actions.',
      route: '/dashboard/equipment',
      sources: LIST,
    },
    {
      id: 'filters',
      title: 'Equipment filters',
      description: 'Filter sheet for the equipment list.',
      route: '/dashboard/equipment',
      steps: [{ action: 'click', target: { role: 'button', name: /open filters/i } }],
      sources: LIST,
    },
    {
      id: 'personalization',
      title: 'Equipment list personalization',
      description: 'List view / sort / column personalization.',
      route: '/dashboard/equipment',
      steps: [{ action: 'click', target: { role: 'button', name: /open personalization/i } }],
      sources: LIST,
    },
    {
      id: 'qr-code',
      title: 'Equipment QR code',
      description: 'QR code dialog for printing / sharing an asset label.',
      route: '/dashboard/equipment',
      steps: [
        {
          action: 'click',
          target: { role: 'button', name: `Show QR code for ${seedEquipment.cat320.name}`, exact: true },
        },
      ],
      sources: LIST,
    },
    {
      id: 'add-equipment',
      title: 'Add equipment',
      description: 'Create-equipment form opened from the list.',
      route: '/dashboard/equipment',
      steps: [{ action: 'click', target: { role: 'button', name: /^add equipment$/i } }],
      personas: ['owner'],
      sources: LIST,
    },
    {
      id: 'detail',
      title: 'Equipment detail',
      description: 'Asset header, hours, location, quick actions and the Details tab (default).',
      route: CAT320,
      sources: DETAIL,
    },
    detailTab('Orders', 'Work orders for this asset.'),
    detailTab('Notes', 'Asset notes thread.'),
    detailTab('Parts', 'Compatible parts and inventory for this asset (hidden from technicians).', ['owner']),
    detailTab('Images', 'Asset media gallery.'),
    detailTab('Check-Ins', 'Operator daily check-ins recorded for this asset.'),
    detailTab('Scan History', 'QR scan log for this asset.'),
    {
      id: 'quick-actions',
      title: 'Equipment quick actions',
      description: 'Quick-action menu on the equipment detail header.',
      route: CAT320,
      steps: [{ action: 'click', target: { role: 'button', name: /^quick actions for/i } }],
      sources: DETAIL,
    },
    {
      id: 'log-hours',
      title: 'Log working hours',
      description: 'Hour-meter entry opened by tapping the hours chip.',
      route: CAT320,
      steps: [{ action: 'click', target: { role: 'button', name: /working hours: .*tap to log hours/i } }],
      sources: DETAIL,
    },
  ],
};

export const fleetMapFlow: CatalogFlow = {
  id: 'fleet-map',
  title: 'Fleet map',
  area: 'Fleet',
  description: 'Map of equipment locations with the equipment side panel.',
  personas: ['owner', 'technician'],
  screens: [
    {
      id: 'map',
      title: 'Fleet map',
      description:
        'Map view. Locally the Google Maps key is usually missing, so the map area may show an error state.',
      route: '/dashboard/fleet-map',
      sources: ['src/features/fleet-map/pages/FleetMap.tsx'],
    },
  ],
};

export const scanFlow: CatalogFlow = {
  id: 'scan',
  title: 'QR scanner',
  area: 'Field',
  description: 'In-app QR scanner entry point (camera is not available in the capture browser).',
  personas: ['owner', 'technician'],
  screens: [
    {
      id: 'scanner',
      title: 'Scanner',
      description: 'Scanner landing with camera start and image-upload options.',
      route: '/dashboard/scan',
      sources: ['src/features/equipment/pages/EquipmentScanner.tsx'],
    },
    {
      id: 'equipment-qr-signed-in',
      title: 'Equipment QR landing (signed in)',
      description: 'Where scanning an equipment QR takes a signed-in user.',
      route: `/qr/equipment/${seedEquipment.cat320.id}`,
      sources: ['src/features/equipment/pages/EquipmentQRScan.tsx'],
    },
  ],
};
