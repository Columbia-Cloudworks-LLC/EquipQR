import { seedEquipment, seedInvitations } from '../../user/shared/seed-data';
import type { CatalogFlow, CatalogScreen } from '../types';

const feature = (id: string, title: string, file: string): CatalogScreen => ({
  id: `feature-${id}`,
  title: `Feature: ${title}`,
  description: `Marketing feature page for ${title}, as a logged-out visitor sees it on a phone.`,
  route: `/features/${id}`,
  sources: [`src/pages/features/${file}.tsx`],
});

export const publicMarketingFlow: CatalogFlow = {
  id: 'public-marketing',
  title: 'Marketing site',
  area: 'Public',
  description: 'Logged-out marketing pages: landing, solutions and every feature page.',
  personas: ['anonymous'],
  screens: [
    {
      id: 'landing',
      title: 'Landing page',
      description: 'Root URL for a logged-out visitor (SmartLanding renders the marketing landing).',
      route: '/',
      sources: ['src/components/landing/SmartLanding.tsx'],
    },
    {
      id: 'mobile-menu',
      title: 'Landing: mobile menu',
      description: 'Marketing header menu opened on a phone.',
      route: '/',
      steps: [{ action: 'click', target: { role: 'button', name: /menu/i } }],
      sources: ['src/components/landing/SmartLanding.tsx'],
    },
    {
      id: 'repair-shops',
      title: 'Solutions: repair shops',
      description: 'Solutions page aimed at equipment repair shops.',
      route: '/solutions/repair-shops',
      sources: ['src/pages/solutions/RepairShops.tsx'],
    },
    feature('work-order-management', 'Work order management', 'WorkOrderManagement'),
    feature('pm-templates', 'PM templates', 'PMTemplates'),
    feature('qr-code-integration', 'QR code integration', 'QRCodeIntegration'),
    feature('inventory', 'Inventory', 'InventoryManagement'),
    feature('part-lookup-alternates', 'Part lookup & alternates', 'PartLookupAlternates'),
    feature('fleet-visualization', 'Fleet visualization', 'FleetVisualization'),
    feature('team-collaboration', 'Team collaboration', 'TeamCollaboration'),
    feature('customer-crm', 'Customer CRM', 'CustomerCRM'),
    feature('mobile-first-design', 'Mobile-first design', 'MobileFirstDesign'),
    feature('google-workspace', 'Google Workspace', 'GoogleWorkspace'),
    feature('quickbooks', 'QuickBooks', 'QuickBooks'),
  ],
};

export const publicLegalFlow: CatalogFlow = {
  id: 'public-legal-support',
  title: 'Support, trust & legal',
  area: 'Public',
  description: 'Logged-out support, security, release notes, privacy and legal pages.',
  personas: ['anonymous'],
  screens: [
    {
      id: 'support',
      title: 'Support',
      description: 'Public support page.',
      route: '/support',
      sources: ['src/pages/Support.tsx'],
    },
    {
      id: 'security',
      title: 'Security',
      description: 'Security / trust page.',
      route: '/security',
      sources: ['src/pages/Security.tsx'],
    },
    {
      id: 'releases',
      title: 'Release notes',
      description: 'Public changelog / releases page.',
      route: '/releases',
      sources: ['src/pages/Releases.tsx'],
    },
    {
      id: 'privacy-request',
      title: 'Privacy request form',
      description: 'Data subject request intake form.',
      route: '/privacy-request',
      sources: ['src/pages/PrivacyRequest.tsx'],
    },
    {
      id: 'do-not-sell',
      title: 'Do not sell or share',
      description: 'CCPA opt-out page.',
      route: '/do-not-sell-or-share',
      sources: ['src/pages/DoNotSellOrShare.tsx'],
    },
    {
      id: 'privacy-policy',
      title: 'Privacy policy',
      description: 'Long-form legal page; expect many slices.',
      route: '/privacy-policy',
      sources: ['src/pages/PrivacyPolicy.tsx'],
    },
    {
      id: 'terms',
      title: 'Terms of service',
      description: 'Long-form legal page; expect many slices.',
      route: '/terms-of-service',
      sources: ['src/pages/TermsOfService.tsx'],
    },
    {
      id: 'right-to-repair',
      title: 'Right to repair',
      description: 'Right-to-repair statement page.',
      route: '/right-to-repair',
      sources: ['src/pages/RightToRepair.tsx'],
    },
    {
      id: 'not-found',
      title: '404 page',
      description: 'Unknown URL fallback.',
      route: '/this-page-does-not-exist',
      sources: ['src/pages/NotFound.tsx'],
    },
  ],
};

export const authFlow: CatalogFlow = {
  id: 'auth',
  title: 'Sign in & invitations',
  area: 'Public',
  description: 'Authentication entry points and the invitation preview a new member lands on.',
  personas: ['anonymous'],
  screens: [
    {
      id: 'sign-in',
      title: 'Sign in',
      description: 'Default /auth screen with the single primary call to action.',
      route: '/auth',
      sources: ['src/pages/Auth.tsx'],
    },
    {
      id: 'sign-in-email',
      title: 'Sign in with email & password',
      description: 'Email/password path expanded from the sign-in screen.',
      route: '/auth?tab=signin',
      steps: [{ action: 'click', target: { role: 'button', name: /login with email & password/i } }],
      ready: { css: '#signin-email' },
      sources: ['src/pages/Auth.tsx'],
    },
    {
      id: 'sign-up',
      title: 'Sign up',
      description: 'Account creation tab.',
      route: '/auth?tab=signup',
      sources: ['src/pages/Auth.tsx'],
    },
    {
      id: 'invitation',
      title: 'Invitation preview (logged out)',
      description: 'What an invited person sees when opening their invitation link before signing in.',
      route: `/invitation/${seedInvitations.pendingApex.token}`,
      sources: ['src/pages/InvitationAccept.tsx'],
    },
    {
      id: 'equipment-qr-logged-out',
      title: 'Equipment QR scan (logged out)',
      description: 'Scanning an equipment QR code without a session.',
      route: `/qr/equipment/${seedEquipment.cat320.id}`,
      sources: ['src/features/equipment/pages/EquipmentQRScan.tsx'],
    },
  ],
};

/** Raw token from supabase/seeds/generated/54_generated_operator_checkins.sql (Metro fixture). */
const METRO_CHECKIN_TOKEN = '7351d816ecee11bde7a5a8763ee8f74c36fee70c8bc68e3351498fc16cf6cfad';

export const operatorCheckInPublicFlow: CatalogFlow = {
  id: 'operator-check-in-public',
  title: 'Operator daily check-in (QR)',
  area: 'Field',
  description: 'The public, no-login check-in form an equipment operator opens by scanning the yard QR.',
  personas: ['anonymous'],
  screens: [
    {
      id: 'form',
      title: 'Check-in form',
      description: 'Public operator check-in form opened from a QR token.',
      route: `/qr/operator-check-in/${METRO_CHECKIN_TOKEN}`,
      sources: ['src/features/operator-check-ins/pages/OperatorCheckInPublicPage.tsx'],
    },
  ],
};
