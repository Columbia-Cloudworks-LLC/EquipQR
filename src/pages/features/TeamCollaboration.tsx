import { StandardFeaturePage } from '@/components/landing/features/StandardFeaturePage';
import { TeamRolesPermissionsSection } from '@/components/landing/features/TeamRolesPermissionsSection';
import {
  benefits,
  content,
  heroIcon,
  showcases,
  steps,
} from './data/teamCollaborationData';

const TeamCollaborationFeature = () => (
  <StandardFeaturePage
    seoPath="/features/team-collaboration"
    content={content}
    benefits={benefits}
    steps={steps}
    showcases={showcases}
    heroIcon={heroIcon}
    afterSteps={<TeamRolesPermissionsSection />}
  />
);

export default TeamCollaborationFeature;
