import React from 'react';
import { render, screen, fireEvent } from '@vitest-harness/utils/test-utils';
import PMChecklistComponent from './PMChecklistComponent';
import type { PreventativeMaintenance } from '@/features/pm-templates/services/preventativeMaintenanceService';
import type { OrganizationData, WorkOrderData } from '@/features/work-orders/types/workOrderDetails';

export const defaultPmChecklistOrg: OrganizationData = {
  id: 'org-1',
  name: 'Test Org',
  plan: 'free',
  memberCount: 1,
  maxMembers: 5,
  features: [],
};

export function renderPMChecklist(
  pm: PreventativeMaintenance,
  options?: {
    readOnly?: boolean;
    isAdmin?: boolean;
    onUpdate?: () => void;
    organization?: OrganizationData;
    workOrder?: WorkOrderData;
  },
) {
  const onUpdate = options?.onUpdate ?? (() => undefined);
  return render(
    <PMChecklistComponent
      pm={pm}
      onUpdate={onUpdate}
      readOnly={options?.readOnly ?? false}
      isAdmin={options?.isAdmin ?? false}
      organization={options?.organization ?? defaultPmChecklistOrg}
      workOrder={options?.workOrder}
    />,
  );
}

export function openPmSection(sectionName: string): void {
  fireEvent.click(screen.getByText(sectionName));
}

export async function waitForPmItem(title: string): Promise<void> {
  // Accordion content may mount asynchronously; findBy avoids waitFor polling loops.
  expect(await screen.findByText(title)).toBeInTheDocument();
}

export async function openPmSectionAndWaitForItem(
  sectionName: string,
  itemTitle: string,
): Promise<void> {
  openPmSection(sectionName);
  await waitForPmItem(itemTitle);
}
