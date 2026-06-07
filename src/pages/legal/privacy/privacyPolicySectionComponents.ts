import type { ComponentType } from 'react';
import { PrivacyIntroductionSection } from './sections/PrivacyIntroductionSection';
import { PrivacyIndividualCollectionSection } from './sections/PrivacyIndividualCollectionSection';
import { PrivacyOrganizationCollectionSection } from './sections/PrivacyOrganizationCollectionSection';
import { PrivacySubprocessorsSection } from './sections/PrivacySubprocessorsSection';
import { PrivacyCookiesSection } from './sections/PrivacyCookiesSection';
import { PrivacyUsageSection } from './sections/PrivacyUsageSection';
import { PrivacySharingSection } from './sections/PrivacySharingSection';
import { PrivacySecuritySection } from './sections/PrivacySecuritySection';
import { PrivacyRetentionSection } from './sections/PrivacyRetentionSection';
import { PrivacyRightsSection } from './sections/PrivacyRightsSection';
import { PrivacyCaliforniaSection } from './sections/PrivacyCaliforniaSection';
import { PrivacyChildrenSection } from './sections/PrivacyChildrenSection';
import { PrivacyInternationalSection } from './sections/PrivacyInternationalSection';
import { PrivacyChangesSection } from './sections/PrivacyChangesSection';
import { PrivacyContactSection } from './sections/PrivacyContactSection';

export interface PrivacyPolicySectionEntry {
  id: string;
  Component: ComponentType;
}

export const privacyPolicySectionComponents: PrivacyPolicySectionEntry[] = [
  { id: 'introduction', Component: PrivacyIntroductionSection },
  { id: 'individual-collection', Component: PrivacyIndividualCollectionSection },
  { id: 'organization-collection', Component: PrivacyOrganizationCollectionSection },
  { id: 'subprocessors', Component: PrivacySubprocessorsSection },
  { id: 'cookies', Component: PrivacyCookiesSection },
  { id: 'usage', Component: PrivacyUsageSection },
  { id: 'sharing', Component: PrivacySharingSection },
  { id: 'security', Component: PrivacySecuritySection },
  { id: 'retention', Component: PrivacyRetentionSection },
  { id: 'rights', Component: PrivacyRightsSection },
  { id: 'california', Component: PrivacyCaliforniaSection },
  { id: 'children', Component: PrivacyChildrenSection },
  { id: 'international', Component: PrivacyInternationalSection },
  { id: 'changes', Component: PrivacyChangesSection },
  { id: 'contact', Component: PrivacyContactSection },
];
