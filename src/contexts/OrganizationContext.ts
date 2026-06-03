// Compatibility layer - re-export everything from SimpleOrganizationContext
export {
  type SimpleOrganizationContextType as OrganizationContextType,
  type SimpleOrganization
} from './SimpleOrganizationContext';

export { useSimpleOrganization as useOrganization } from '@/hooks/useSimpleOrganization';

