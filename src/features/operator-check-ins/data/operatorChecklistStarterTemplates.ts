import { nanoid } from 'nanoid';
import type { OperatorChecklistTemplateData } from '@/features/operator-check-ins/types/operatorChecklist';

export interface OperatorChecklistStarterTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  templateData: OperatorChecklistTemplateData;
}

function freshId(): string {
  return nanoid(10);
}

function materializeTemplateData(data: OperatorChecklistTemplateData): OperatorChecklistTemplateData {
  return {
    dataFields: data.dataFields.map((field) => ({
      ...field,
      id: freshId(),
    })),
    checklistItems: data.checklistItems.map((item) => ({
      ...item,
      id: freshId(),
    })),
  };
}

const ODOMETER_LOG_STARTER: OperatorChecklistStarterTemplate = {
  id: 'starter-odometer-log',
  name: 'Odometer Log',
  icon: 'Gauge',
  description:
    'Quick daily odometer reading with operator name and optional notes. Supports audit documentation.',
  templateData: {
    dataFields: [
      {
        id: 'placeholder-name',
        label: 'Your name',
        source: 'operator_input',
        inputType: 'text',
        required: true,
      },
      {
        id: 'placeholder-odometer',
        label: 'Odometer reading',
        source: 'operator_input',
        inputType: 'number',
        required: true,
        helpText: 'Enter the current odometer or hour meter reading.',
      },
      {
        id: 'placeholder-notes',
        label: 'Notes',
        source: 'operator_input',
        inputType: 'textarea',
        required: false,
      },
      {
        id: 'placeholder-ts',
        label: 'Submitted at',
        source: 'client_context',
        clientKey: 'submitted_timestamp',
        required: true,
      },
    ],
    checklistItems: [],
  },
};

const DVIR_SECTIONS: { section: string; items: string[] }[] = [
  {
    section: 'Brakes',
    items: ['Service brakes operate correctly', 'Parking brake holds vehicle'],
  },
  {
    section: 'Steering',
    items: ['Steering wheel free of excessive play', 'Steering linkage secure'],
  },
  {
    section: 'Lights & Reflectors',
    items: ['Headlights and tail lights working', 'Turn signals and brake lights working', 'Reflectors present and visible'],
  },
  {
    section: 'Tires, Wheels & Rims',
    items: ['Tires properly inflated and not damaged', 'Wheels and rims secure, no cracks'],
  },
  {
    section: 'Visibility',
    items: ['Windshield and mirrors clean and intact', 'Wipers and washers functional'],
  },
  {
    section: 'Coupling Devices',
    items: ['Fifth wheel / coupling secure (if applicable)', 'Safety chains and pins in place (if applicable)'],
  },
  {
    section: 'Emergency Equipment',
    items: ['Fire extinguisher present and charged', 'Warning triangles / flares available'],
  },
  {
    section: 'Cargo Securement',
    items: ['Cargo properly blocked, braced, tied, or otherwise secured'],
  },
];

const FMCSA_DVIR_STARTER: OperatorChecklistStarterTemplate = {
  id: 'starter-fmcsa-dvir',
  name: 'FMCSA-style DVIR starter',
  icon: 'Truck',
  description:
    'Driver vehicle inspection checklist covering common pre-trip areas. Supports documentation — not a legal compliance certification.',
  templateData: {
    dataFields: [
      {
        id: 'placeholder-name',
        label: 'Driver / operator name',
        source: 'operator_input',
        inputType: 'text',
        required: true,
      },
      {
        id: 'placeholder-odometer',
        label: 'Odometer reading',
        source: 'operator_input',
        inputType: 'number',
        required: false,
      },
      {
        id: 'placeholder-ts',
        label: 'Submitted at',
        source: 'client_context',
        clientKey: 'submitted_timestamp',
        required: true,
      },
      {
        id: 'placeholder-equip-name',
        label: 'Equipment name',
        source: 'equipment_snapshot',
        equipmentKey: 'name',
        required: true,
      },
      {
        id: 'placeholder-serial',
        label: 'Serial number',
        source: 'equipment_snapshot',
        equipmentKey: 'serial_number',
        required: false,
      },
    ],
    checklistItems: DVIR_SECTIONS.flatMap(({ section, items }) =>
      items.map((title) => ({
        id: 'placeholder-item',
        title,
        required: true,
        section,
      })),
    ),
  },
};

export const OPERATOR_CHECKLIST_STARTER_TEMPLATES: OperatorChecklistStarterTemplate[] = [
  ODOMETER_LOG_STARTER,
  FMCSA_DVIR_STARTER,
];

export function materializeOperatorChecklistStarter(
  starter: OperatorChecklistStarterTemplate,
): { name: string; description: string; templateData: OperatorChecklistTemplateData } {
  return {
    name: starter.name,
    description: starter.description,
    templateData: materializeTemplateData(starter.templateData),
  };
}