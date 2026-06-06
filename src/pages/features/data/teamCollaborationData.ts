import { Users, Shield, BarChart2 } from 'lucide-react';
import { landingImage } from '@/lib/landingImage';
import type { Benefit, FeaturePageContent, ImageScreenshot, Step } from './featurePageTypes';

export const content: FeaturePageContent = {
  benefitsTitle: 'Why Use Team Collaboration?',
  benefitsDescription:
    'Give each team a dedicated view of equipment and work orders. Control who sees what with roles and permissions, and balance workload across your org.',
  stepsTitle: 'How It Works',
  stepsDescription: 'Teams connect people, equipment, and work orders in one place.',
  showcaseTitle: 'See Team Collaboration in Action',
  showcaseDescription: "Here's what teams and permissions look like in the EquipQR™ app.",
  showcaseClassName: 'bg-muted/30',
  ctaTitle: 'Ready to Organize Your Teams?',
  ctaDescription:
    'Start using Team Collaboration today—completely free. Create your account, set up teams, and distribute work with clear visibility and control.',
  ctaPrimaryText: 'Start Using Teams Free',
};

export const benefits: Benefit[] = [
  {
    icon: Users,
    iconColor: 'success',
    title: 'Cross-Organizational Teams',
    subtitle: 'One workspace, many teams',
    description:
      "Create teams that span your organization or map to locations, divisions, or crews. Assign equipment and work orders to teams so members see only what's relevant to them.",
    benefits: ['Team-scoped equipment', 'Team-scoped work orders', 'Flexible structure'],
    benefitColor: 'success',
  },
  {
    icon: Shield,
    iconColor: 'info',
    title: 'Role-Based Permissions',
    subtitle: 'Control access by role',
    description:
      'Assign admin, member, or viewer roles at the organization and team level. Admins manage settings and members; members perform work; viewers see read-only data.',
    benefits: ['Org and team roles', 'Invite and manage members', 'Secure by default'],
    benefitColor: 'info',
  },
  {
    icon: BarChart2,
    iconColor: 'warning',
    title: 'Workload Balancing',
    subtitle: 'Distribute work fairly',
    description:
      'See how work is distributed across teams and technicians. Use dashboards and filters to identify overloaded assignees and reassign or rebalance as needed.',
    benefits: ['Team dashboards', 'Assignee visibility', 'Performance insights'],
    benefitColor: 'warning',
  },
];

export const steps: Step[] = [
  {
    number: 1,
    title: 'Create Teams',
    description:
      'Create teams that match your structure—by location, trade, or project. Add members and assign roles. Each team can have its own equipment and work order scope.',
  },
  {
    number: 2,
    title: 'Assign Equipment & Work',
    description:
      'Link equipment to teams so members see only relevant assets. Assign work orders to teams or individuals. Use filters and dashboards to view workload by team.',
  },
  {
    number: 3,
    title: 'Collaborate in Context',
    description:
      'Team members access equipment, work orders, and PMs from their team view. Admins manage members, settings, and visibility. Viewers get read-only access where configured.',
  },
  {
    number: 4,
    title: 'Track & Rebalance',
    description:
      'Monitor completion rates, overdue work, and assignee load. Reassign work or adjust team scope as needed. Use fleet efficiency and dashboard metrics to optimize allocation.',
  },
];

export const showcases: ImageScreenshot[] = [
  {
    kind: 'image',
    imageUrl: landingImage('teams-list-2026-04.png'),
    imageAlt: 'Teams list showing all teams with member counts and roles',
    title: 'Organization Teams',
    description:
      'View all teams in your organization at a glance. See team descriptions, member counts, and quickly identify who belongs to each team. Create new teams or manage existing ones from a single dashboard.',
  },
  {
    kind: 'image',
    imageUrl: landingImage('team-detail-2026-04.png'),
    imageAlt: 'Team detail page showing role assignments for team members',
    title: 'Role-Based Team Access',
    description:
      'Assign each team member a role — Manager, Technician, Requestor, or Viewer. Managers oversee the team and handle work order flow; Technicians perform and log work; Requestors submit work order requests directly from a QR scan; Viewers get read-only access. Every action is attributed by role so you always know who did what.',
  },
];

export const heroIcon = Users;
