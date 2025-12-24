// Organization Feature Barrel Export
// This file exports the key components, hooks, types, and services from the organization feature

// Components
export { default as OrganizationHeader } from './components/OrganizationHeader';
export { default as OrganizationOverview } from './components/OrganizationOverview';
export { default as OrganizationSettings } from './components/OrganizationSettings';
export { default as OrganizationSidebar } from './components/OrganizationSidebar';
export { OrganizationSwitcher } from './components/OrganizationSwitcher';
export { default as OrganizationTabs } from './components/OrganizationTabs';
export { default as MembersList } from './components/MembersList';
export { default as MemberManagement } from './components/MemberManagement';
export { InviteMemberDialog } from './components/InviteMemberDialog';
export { InvitationManagement } from './components/InvitationManagement';
export { MemberLimitWarning } from './components/MemberLimitWarning';
export { AdminsTabContent } from './components/AdminsTabContent';
export { UnifiedMembersList } from './components/UnifiedMembersList';
export { QuickBooksIntegration } from './components/QuickBooksIntegration';
export { RestrictedOrganizationAccess } from './components/RestrictedOrganizationAccess';
export { SimplifiedInvitationDialog } from './components/SimplifiedInvitationDialog';
export { ChecklistTemplateEditor } from './components/ChecklistTemplateEditor';
export { OrganizationSettingsTab } from './components/OrganizationSettingsTab';

// Types
export type { 
  Organization,
  OrganizationMember,
  OrganizationInvitation 
} from './types/organization';
export type { OrganizationContextType } from './types/organizationContext';

// Services
export * from './services/organizationService';
export * from './services/organizationStorageService';

