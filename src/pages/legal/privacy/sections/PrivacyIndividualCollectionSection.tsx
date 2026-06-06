import { PrivacyDataCategoryTable } from '@/components/legal/PrivacyDataCategoryTable';
import { individualDataCategories } from '@/pages/legal/privacy/data/individualDataCategories';
import { LegalPolicySection } from '@/components/legal/LegalPolicySection';

export function PrivacyIndividualCollectionSection() {
  return (
    <LegalPolicySection
      title="2. Information We Collect — Individual User Level (Notice at Collection)"
      id="notice-at-collection"
      className="scroll-mt-24"
    >
      <p>
        When you create an account or interact with EquipQR, we collect information tied to you
        personally. The table below lists every category of individual-level data and exactly what is
        collected.
      </p>
      <PrivacyDataCategoryTable rows={individualDataCategories} />
    </LegalPolicySection>
  );
}
