import { PageBackButton } from '@/components/layout/PageBackButton';
import { PageSEO } from '@/components/seo/PageSEO';
import {
  PRIVACY_POLICY_LAST_UPDATED,
  PRIVACY_POLICY_SEO,
} from '@/pages/legal/privacy/privacyPolicyMeta';
import { privacyPolicySectionComponents } from '@/pages/legal/privacy/privacyPolicySectionComponents';

export default function PrivacyPolicy() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <PageSEO
        title={PRIVACY_POLICY_SEO.title}
        description={PRIVACY_POLICY_SEO.description}
        path={PRIVACY_POLICY_SEO.path}
      />
      <div className="mb-8">
        <PageBackButton className="mb-4" />
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-muted-foreground">Last updated: {PRIVACY_POLICY_LAST_UPDATED}</p>
        </div>
      </div>

      <div className="space-y-8">
        {privacyPolicySectionComponents.map(({ id, Component }) => (
          <Component key={id} />
        ))}
      </div>
    </div>
  );
}
