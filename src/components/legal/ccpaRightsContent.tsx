export interface CcpaRightSummaryItem {
  title: string;
  description: string;
}

export interface CcpaRightPolicyItem {
  title: string;
  description: string;
}

/** Summary list for the privacy request intake page. */
export const ccpaRightsSummaryItems: CcpaRightSummaryItem[] = [
  {
    title: 'Know and access',
    description: 'the personal information we have collected about you.',
  },
  {
    title: 'Delete',
    description: 'your personal information, subject to certain exceptions.',
  },
  {
    title: 'Correct',
    description: 'inaccurate personal information we hold about you.',
  },
  {
    title: 'Opt out',
    description:
      'of the sale or sharing of your personal information for cross-context behavioral advertising.',
  },
  {
    title: 'Limit the use',
    description:
      'of your sensitive personal information to purposes necessary to provide the services you requested.',
  },
  {
    title: 'Non-discrimination',
    description: 'for exercising your privacy rights.',
  },
];

/** Detailed list for Section 10A of the Privacy Policy. */
export const ccpaRightsPolicyItems: CcpaRightPolicyItem[] = [
  {
    title: 'Right to Know / Access:',
    description:
      'You may request that we disclose the categories and specific pieces of personal information we have collected about you.',
  },
  {
    title: 'Right to Delete:',
    description:
      'You may request that we delete personal information we have collected from you, subject to certain exceptions (e.g., audit log retention for regulatory compliance).',
  },
  {
    title: 'Right to Correct:',
    description: 'You may request that we correct inaccurate personal information.',
  },
  {
    title: 'Right to Opt-Out of Sale/Sharing:',
    description:
      'Because we do not sell or share personal information for cross-context behavioral advertising, no opt-out action is required. If this changes, we will provide a conspicuous opt-out mechanism.',
  },
  {
    title: 'Right to Limit Use of Sensitive PI:',
    description:
      'You may limit our use of your Sensitive Personal Information. You can disable GPS data collection for your scans in your account settings under "Privacy."',
  },
  {
    title: 'Right to Non-Discrimination:',
    description:
      'We will not discriminate against you for exercising any of your CCPA/CPRA rights. You will not receive different pricing, quality of service, or access levels.',
  },
];
