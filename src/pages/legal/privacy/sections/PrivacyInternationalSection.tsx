import { LegalPolicySection } from '@/components/legal/LegalPolicySection';

export function PrivacyInternationalSection() {
  return (
    <LegalPolicySection title="12. International Data Transfers">
            <p>
              EquipQR is operated from the United States. Your data is processed and stored in the
              United States through our infrastructure providers (Supabase on AWS and Vercel). If you
              access EquipQR from outside the United States, please be aware that your information
              will be transferred to, stored, and processed in the United States, where data
              protection laws may differ from those in your jurisdiction.
            </p>
            <p>
              By using the Service, you consent to the transfer of your information to the United
              States. If your organization requires specific transfer mechanisms (such as Standard
              Contractual Clauses), please contact us to discuss available options.
            </p></LegalPolicySection>
  );
}
