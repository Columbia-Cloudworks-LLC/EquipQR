import { PolicyProviderSection } from '@/components/legal/PolicyList';
import { subprocessorProviders } from '@/pages/legal/privacy/data/subprocessorProviders';
import { LegalPolicySection } from '@/components/legal/LegalPolicySection';

export function PrivacySubprocessorsSection() {
  return (
    <LegalPolicySection title="4. External Service Providers (Subprocessors)">
      <p>
        We use the following third-party service providers to operate EquipQR. For each provider we
        disclose the purpose, what data flows to them, what data flows back, and what (if anything) is
        stored in EquipQR as a result. Optional integrations are clearly marked and are only
        activated when an organization administrator explicitly connects them.
      </p>
      {subprocessorProviders.map((provider) => (
        <PolicyProviderSection key={provider.title} title={provider.title} items={provider.items} />
      ))}
    </LegalPolicySection>
  );
}
