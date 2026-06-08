import { Building2, Users, RefreshCw, Shield } from 'lucide-react';
import { landingImage } from '@/lib/landingImage';
import type { Benefit, FeaturePageContent, ImageScreenshot, Step } from './featurePageTypes';

export const content: FeaturePageContent = {
  benefitsTitle: 'Why Use Google Workspace Integration?',
  benefitsDescription:
    'Import and manage organization members directly from your Google Workspace directory. No manual invites—sync users, assign roles, and rely on Google sign-in for access.',
  stepsTitle: 'How It Works',
  stepsDescription: 'Google Workspace integration connects your directory to EquipQR™ in a few steps.',
  showcaseTitle: 'See Google Workspace Integration in Action',
  showcaseDescription:
    "Here's what connecting and importing from Google Workspace looks like in the EquipQR™ app.",
  showcaseClassName: 'bg-muted/30',
  ctaTitle: 'Ready to Import Your Team from Google?',
  ctaDescription:
    'Start using Google Workspace integration today—completely free. Create your account, connect your Workspace, and import members in minutes.',
  ctaPrimaryText: 'Start Using Google Workspace Integration Free',
};

export const benefits: Benefit[] = [
  {
    icon: RefreshCw,
    iconColor: 'success',
    title: 'Directory Sync',
    subtitle: 'One source of truth',
    description:
      'Connect your Workspace domain and sync users from your Google directory. Pull in everyone who belongs to your organization so you can add them as EquipQR™ members with a few clicks.',
    benefits: ['Sync from Google directory', 'Re-sync when roster changes', 'Domain-scoped access'],
    benefitColor: 'success',
  },
  {
    icon: Users,
    iconColor: 'info',
    title: 'Import Members',
    subtitle: 'Select who joins your org',
    description:
      "After syncing, choose which directory users to add as organization members. Select individuals or bulk-add. Pending users appear until they sign in with Google—then they're automatically added.",
    benefits: ['Pick users from directory', 'Pending until sign-in', 'Assign roles on add'],
    benefitColor: 'info',
  },
  {
    icon: Shield,
    iconColor: 'warning',
    title: 'Google Sign-In',
    subtitle: 'Secure, familiar login',
    description:
      'Members sign in with their Google account. Admin access is granted after they authenticate with a Workspace identity. No separate EquipQR™ passwords to manage—just Google.',
    benefits: ['Sign in with Google', 'Workspace identity', 'No extra passwords'],
    benefitColor: 'warning',
  },
];

export const steps: Step[] = [
  {
    number: 1,
    title: 'Connect Google Workspace',
    description:
      'In Organization Settings → Integrations, connect your Google Workspace. Authorize EquipQR™ to access your organization’s directory. Your domain is linked to your EquipQR™ org.',
  },
  {
    number: 2,
    title: 'Sync Directory',
    description:
      'Sync users from your Google directory. The list populates with everyone in your Workspace. Re-sync anytime to reflect new hires or departures.',
  },
  {
    number: 3,
    title: 'Import Members',
    description:
      'Open “Import from Google Workspace” and select which users to add. Assign roles (admin, member, viewer). Selected users show as pending until they sign in with Google.',
  },
  {
    number: 4,
    title: 'Sign In & Access',
    description:
      'Invited users sign in with their Google account. Once authenticated, they’re added to the organization and can access EquipQR™ based on their role. No manual invite emails required.',
  },
];

export const showcases: ImageScreenshot[] = [
  {
    kind: 'image',
    imageUrl: landingImage('google-workspace-settings-2026-04.png'),
    imageAlt: 'Organization Settings showing Google Workspace integration with connected domain',
    title: 'Connect & Sync Directory',
    description:
      'Connect your Google Workspace in Organization Settings. After authorization, sync your directory to load users. View connected domain and use “Sync Directory” to refresh the list.',
  },
  {
    kind: 'image',
    imageUrl: landingImage('team-detail-2026-04.png'),
    imageAlt: 'Team member list showing Google Workspace members imported into EquipQR with assigned roles',
    title: 'Import from Google Workspace',
    description:
      'Select users from your synced directory to add as organization members. Choose roles, then confirm. Imported members appear in the team roster and can sign in immediately with their Google account.',
  },
];

export const heroIcon = Building2;
