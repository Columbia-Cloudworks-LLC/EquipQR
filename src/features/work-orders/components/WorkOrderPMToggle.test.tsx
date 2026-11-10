import React, { useCallback, useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { WorkOrderPMToggle } from './WorkOrderPMToggle';
import type {
  WorkOrderPMChecklistEquipment,
  WorkOrderPMChecklistSetValue,
  WorkOrderPMChecklistValues,
} from '@/features/work-orders/hooks/useWorkOrderPMChecklist';

const TEMPLATES = [
  {
    id: 'tmpl-forklift',
    name: 'Forklift PM',
    is_protected: false,
    organization_id: null,
    interval_value: null,
    interval_type: null,
    sections: [{ name: 'Engine', count: 2 }],
    itemCount: 2,
  },
];

vi.mock('@/features/pm-templates/hooks/usePMTemplates', () => ({
  usePMTemplatesForOrganization: () => ({
    data: TEMPLATES,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/features/pm-templates/hooks/usePMTemplateCompatibility', () => ({
  useMatchingPMTemplatesForOrganization: () => ({
    data: [],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/hooks/useSimpleOrganization', () => ({
  useSimpleOrganizationSafe: () => ({ currentOrganization: { id: 'org-1' } }),
}));

const EQUIPMENT_WITH_DEFAULT: WorkOrderPMChecklistEquipment = {
  id: 'eq-1',
  name: 'Forklift 1',
  default_pm_template_id: 'tmpl-forklift',
};
const EQUIPMENT_WITHOUT_DEFAULT: WorkOrderPMChecklistEquipment = {
  id: 'eq-2',
  name: 'Light Tower',
  default_pm_template_id: null,
};

/** Hosts the toggle with real form-like state so equipment changes can be simulated. */
function Harness({ initialEquipment }: { initialEquipment?: WorkOrderPMChecklistEquipment }) {
  const [values, setValues] = useState<WorkOrderPMChecklistValues>({ hasPM: false, pmTemplateId: null });
  const [equipment, setEquipment] = useState(initialEquipment);
  const [signal, setSignal] = useState(0);
  const setValue = useCallback<WorkOrderPMChecklistSetValue>((field, value) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  }, []);

  return (
    <div>
      <WorkOrderPMToggle
        values={values}
        setValue={setValue}
        selectedEquipment={equipment}
        turnOnSignal={signal}
      />
      <span data-testid="template">{values.pmTemplateId ?? 'none'}</span>
      <button type="button" onClick={() => setSignal((current) => current + 1)}>
        PM chip
      </button>
      <button type="button" onClick={() => setEquipment(EQUIPMENT_WITHOUT_DEFAULT)}>
        Pick light tower
      </button>
      <button type="button" onClick={() => setEquipment(EQUIPMENT_WITH_DEFAULT)}>
        Pick forklift
      </button>
    </div>
  );
}

describe('WorkOrderPMToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('is off by default and has no template picker until turned on', () => {
    render(<Harness />);

    expect(screen.getByRole('switch', { name: 'Include PM' })).not.toBeChecked();
    expect(screen.queryByRole('combobox', { name: 'PM template' })).not.toBeInTheDocument();
  });

  it('turns on with the standard checklist when the equipment has no template', () => {
    render(<Harness initialEquipment={EQUIPMENT_WITHOUT_DEFAULT} />);

    fireEvent.click(screen.getByRole('switch', { name: 'Include PM' }));

    expect(screen.getByRole('switch', { name: 'Include PM' })).toBeChecked();
    expect(screen.getByTestId('template')).toHaveTextContent('none');
    expect(screen.getByRole('combobox', { name: 'PM template' })).toHaveTextContent('Standard forklift checklist');
  });

  it("defaults to the equipment's assigned template", () => {
    render(<Harness initialEquipment={EQUIPMENT_WITH_DEFAULT} />);

    expect(screen.getByRole('switch', { name: 'Include PM' })).toBeChecked();
    expect(screen.getByTestId('template')).toHaveTextContent('tmpl-forklift');
  });

  it('keeps PM on when equipment is chosen after the Preventative Maintenance chip', () => {
    render(<Harness />);

    fireEvent.click(screen.getByRole('button', { name: 'PM chip' }));
    expect(screen.getByRole('switch', { name: 'Include PM' })).toBeChecked();

    // Equipment without a default template must not silently switch PM back off.
    fireEvent.click(screen.getByRole('button', { name: 'Pick light tower' }));

    expect(screen.getByRole('switch', { name: 'Include PM' })).toBeChecked();
  });

  it('keeps an explicit "off" when equipment with a default template is chosen afterwards', () => {
    render(<Harness initialEquipment={EQUIPMENT_WITH_DEFAULT} />);

    fireEvent.click(screen.getByRole('switch', { name: 'Include PM' }));
    expect(screen.getByRole('switch', { name: 'Include PM' })).not.toBeChecked();

    fireEvent.click(screen.getByRole('button', { name: 'Pick light tower' }));
    fireEvent.click(screen.getByRole('button', { name: 'Pick forklift' }));

    expect(screen.getByRole('switch', { name: 'Include PM' })).not.toBeChecked();
  });
});
