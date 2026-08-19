import { describe, expect, it } from 'vitest';
import { FEATURE_SEO_BY_PATH } from '@/lib/featureSeoContent';
import { steps as customerCrmSteps } from '@/pages/features/data/customerCrmData';
import { steps as fleetVisualizationSteps } from '@/pages/features/data/fleetVisualizationData';
import { steps as googleWorkspaceSteps } from '@/pages/features/data/googleWorkspaceData';
import { steps as inventorySteps } from '@/pages/features/data/inventoryManagementData';
import { steps as mobileFirstSteps } from '@/pages/features/data/mobileFirstDesignData';
import { steps as partLookupSteps } from '@/pages/features/data/partLookupAlternatesData';
import { steps as pmTemplatesSteps } from '@/pages/features/data/pmTemplatesData';
import { steps as qrCodeSteps } from '@/pages/features/data/qrCodeIntegrationData';
import { steps as quickBooksSteps } from '@/pages/features/data/quickBooksData';
import { steps as teamCollaborationSteps } from '@/pages/features/data/teamCollaborationData';
import { steps as workOrderSteps } from '@/pages/features/data/workOrderManagementData';
import {
  assertFeatureMarketingParity,
  mapVisibleStepsToHowTo,
} from '@/lib/featureMarketingDerivation';
import { MARKETING_ROUTES } from '@/lib/marketingRoutes';

const visibleStepsByPath = {
  '/features/customer-crm': customerCrmSteps,
  '/features/fleet-visualization': fleetVisualizationSteps,
  '/features/google-workspace': googleWorkspaceSteps,
  '/features/inventory': inventorySteps,
  '/features/mobile-first-design': mobileFirstSteps,
  '/features/part-lookup-alternates': partLookupSteps,
  '/features/pm-templates': pmTemplatesSteps,
  '/features/qr-code-integration': qrCodeSteps,
  '/features/quickbooks': quickBooksSteps,
  '/features/team-collaboration': teamCollaborationSteps,
  '/features/work-order-management': workOrderSteps,
};

describe('feature marketing parity', () => {
  it('keeps MARKETING_ROUTES feature copy aligned with FEATURE_SEO_BY_PATH and visible steps', () => {
    expect(() =>
      assertFeatureMarketingParity({
        routes: MARKETING_ROUTES,
        seoByPath: FEATURE_SEO_BY_PATH,
        visibleStepsByPath,
      }),
    ).not.toThrow();
  });

  it('maps visible QR steps into HowTo name/text pairs', () => {
    expect(mapVisibleStepsToHowTo(qrCodeSteps)).toEqual([
      { name: qrCodeSteps[0].title, text: qrCodeSteps[0].description },
      { name: qrCodeSteps[1].title, text: qrCodeSteps[1].description },
      { name: qrCodeSteps[2].title, text: qrCodeSteps[2].description },
    ]);
  });
});
