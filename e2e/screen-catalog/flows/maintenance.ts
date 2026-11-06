import { seedPmTemplates, seedWorkOrders } from '../../user/shared/seed-data';
import type { CatalogFlow } from '../types';

const WO_LIST = ['src/features/work-orders/pages/WorkOrders.tsx'];
const WO_DETAIL = ['src/features/work-orders/pages/WorkOrderDetails.tsx'];
const wo = (id: string) => `/dashboard/work-orders/${id}`;

export const workOrdersFlow: CatalogFlow = {
  id: 'work-orders',
  title: 'Work orders',
  area: 'Maintenance',
  description:
    'Find work, open a work order in each lifecycle state, change status, and log costs and labor.',
  personas: ['owner', 'technician'],
  screens: [
    {
      id: 'list',
      title: 'Work order list',
      description: 'Default list view.',
      route: '/dashboard/work-orders',
      sources: WO_LIST,
    },
    {
      id: 'agenda',
      title: 'Work order agenda view',
      description: 'Agenda (by due date) view of work orders.',
      route: '/dashboard/work-orders',
      steps: [{ action: 'click', target: { role: 'radio', name: /^agenda view$/i } }],
      capture: 'page',
      sources: WO_LIST,
    },
    {
      id: 'filters',
      title: 'Work order filters',
      description: 'Filter sheet for the work order list.',
      route: '/dashboard/work-orders',
      steps: [{ action: 'click', target: { role: 'button', name: /open filters/i } }],
      sources: WO_LIST,
    },
    {
      id: 'create',
      title: 'Create work order',
      description: 'New work order form.',
      route: '/dashboard/work-orders',
      steps: [{ action: 'click', target: { role: 'button', name: /^create work order$/i } }],
      sources: WO_LIST,
    },
    {
      id: 'detail-in-progress',
      title: 'Work order: in progress',
      description: `"${seedWorkOrders.oilChange.title}" — in-progress work order with notes, costs and timeline.`,
      route: wo(seedWorkOrders.oilChange.id),
      sources: WO_DETAIL,
    },
    {
      id: 'status-menu',
      title: 'Change status',
      description: 'Status transition control on an in-progress work order.',
      route: wo(seedWorkOrders.oilChange.id),
      steps: [{ action: 'click', target: { role: 'button', name: /^status: .*change status$/i } }],
      sources: WO_DETAIL,
    },
    {
      id: 'add-cost',
      title: 'Add cost',
      description: 'Cost entry on a work order.',
      route: wo(seedWorkOrders.oilChange.id),
      steps: [{ action: 'click', target: { role: 'button', name: /^add cost$/i } }],
      personas: ['owner'],
      sources: WO_DETAIL,
    },
    {
      id: 'add-labor',
      title: 'Add labor',
      description: 'Labor time entry on a work order.',
      route: wo(seedWorkOrders.oilChange.id),
      steps: [{ action: 'click', target: { role: 'button', name: /^add labor$/i } }],
      sources: WO_DETAIL,
    },
    {
      id: 'quick-actions',
      title: 'Work order quick actions',
      description: 'Overflow menu on the work order detail.',
      route: wo(seedWorkOrders.oilChange.id),
      steps: [{ action: 'click', target: { role: 'button', name: /open work order quick actions/i } }],
      sources: WO_DETAIL,
    },
    {
      id: 'detail-submitted',
      title: 'Work order: submitted',
      description: `"${seedWorkOrders.submitted.title}" — newly submitted, not yet accepted.`,
      route: wo(seedWorkOrders.submitted.id),
      sources: WO_DETAIL,
    },
    {
      id: 'detail-assigned',
      title: 'Work order: assigned',
      description: `"${seedWorkOrders.assigned.title}" — assigned to a technician.`,
      route: wo(seedWorkOrders.assigned.id),
      sources: WO_DETAIL,
    },
    {
      id: 'detail-on-hold',
      title: 'Work order: on hold',
      description: `"${seedWorkOrders.onHold.title}" — paused work order.`,
      route: wo(seedWorkOrders.onHold.id),
      sources: WO_DETAIL,
    },
    {
      id: 'detail-completed-pm',
      title: 'Work order: completed with PM',
      description: `"${seedWorkOrders.apexCompletedPm.title}" — completed work order with a completed PM checklist.`,
      route: wo(seedWorkOrders.apexCompletedPm.id),
      sources: WO_DETAIL,
    },
    {
      id: 'detail-cancelled',
      title: 'Work order: cancelled',
      description: `"${seedWorkOrders.cancelled.title}" — cancelled work order.`,
      route: wo(seedWorkOrders.cancelled.id),
      sources: WO_DETAIL,
    },
  ],
};

export const pmTemplatesFlow: CatalogFlow = {
  id: 'pm-templates',
  title: 'PM templates',
  area: 'Maintenance',
  description: 'Preventive-maintenance checklist templates: browse, view, apply and author.',
  personas: ['owner', 'technician'],
  screens: [
    {
      id: 'list',
      title: 'PM template library',
      description: 'EquipQR and organization templates.',
      route: '/dashboard/pm-templates',
      sources: ['src/features/pm-templates/pages/PMTemplates.tsx'],
    },
    {
      id: 'view',
      title: 'PM template detail',
      description: 'Read-only view of the Forklift PM template sections.',
      route: `/dashboard/pm-templates/${seedPmTemplates.forklift.id}`,
      sources: ['src/features/pm-templates/pages/PMTemplateView.tsx'],
    },
    {
      id: 'view-expanded',
      title: 'PM template detail (expanded)',
      description: 'Forklift PM with every section expanded to show checklist items.',
      route: `/dashboard/pm-templates/${seedPmTemplates.forklift.id}`,
      steps: [{ action: 'click', target: { role: 'button', name: /^expand all$/i } }],
      capture: 'page',
      sources: ['src/features/pm-templates/pages/PMTemplateView.tsx'],
    },
    {
      id: 'apply',
      title: 'Apply template to equipment',
      description: 'Apply-to-equipment dialog from the template view.',
      route: `/dashboard/pm-templates/${seedPmTemplates.forklift.id}`,
      steps: [{ action: 'click', target: { role: 'button', name: /^apply to equipment$/i } }],
      personas: ['owner'],
      sources: ['src/features/pm-templates/pages/PMTemplateView.tsx'],
    },
    {
      id: 'new',
      title: 'New PM template',
      description: 'Template editor for a new template.',
      route: '/dashboard/pm-templates/new',
      personas: ['owner'],
      sources: ['src/features/pm-templates/pages/PMTemplateEditor.tsx'],
    },
  ],
};
