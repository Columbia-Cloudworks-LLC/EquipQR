import { PrivacyDataCategoryTable } from '@/components/legal/PrivacyDataCategoryTable';
import { organizationDataCategories } from '@/pages/legal/privacy/data/organizationDataCategories';
import { LegalPolicySection } from '@/components/legal/LegalPolicySection';

export function PrivacyOrganizationCollectionSection() {
  return (
    <LegalPolicySection title="3. Information We Collect — Organization Level">
      <p>
        Organizations that use EquipQR store business data within the platform. This data belongs to
        the organization and is isolated from other organizations through strict database-level
        security controls (Row Level Security). The table below details every category of
        organization-level data.
      </p>
      <PrivacyDataCategoryTable rows={organizationDataCategories} />
    </LegalPolicySection>
  );
}
