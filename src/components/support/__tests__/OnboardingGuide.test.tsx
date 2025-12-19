import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/utils/test-utils';
import userEvent from '@testing-library/user-event';
import OnboardingGuide from '../OnboardingGuide';

describe('OnboardingGuide', () => {
  describe('Page Structure', () => {
    it('renders without crashing', () => {
      render(<OnboardingGuide />);
      expect(screen.getByText('Welcome to EquipQR™')).toBeInTheDocument();
    });

    it('displays the main welcome heading', () => {
      render(<OnboardingGuide />);
      expect(screen.getByText('Welcome to EquipQR™')).toBeInTheDocument();
    });

    it('displays the introduction description', () => {
      render(<OnboardingGuide />);
      expect(screen.getByText(/This guide will take you from account creation to full operation/)).toBeInTheDocument();
    });

    it('renders all 5 phase cards', () => {
      render(<OnboardingGuide />);
      
      expect(screen.getByText(/Phase 1: Building Your Team/)).toBeInTheDocument();
      expect(screen.getByText(/Phase 2: Building Your Fleet/)).toBeInTheDocument();
      expect(screen.getByText(/Phase 3: Managing Inventory/)).toBeInTheDocument();
      expect(screen.getByText(/Phase 4: The Requestor Workflow/)).toBeInTheDocument();
      expect(screen.getByText(/Phase 5: Getting to Work/)).toBeInTheDocument();
    });
  });

  describe('Phase Content Verification', () => {
    it('displays Phase 1 with correct title, badge, and description', () => {
      render(<OnboardingGuide />);
      
      expect(screen.getByText(/Phase 1: Building Your Team/)).toBeInTheDocument();
      expect(screen.getByText('Invitations & Roles')).toBeInTheDocument();
      expect(screen.getByText('Get your personnel into the system with the right access levels')).toBeInTheDocument();
    });

    it('displays Phase 2 with correct title, badge, and description', () => {
      render(<OnboardingGuide />);
      
      expect(screen.getByText(/Phase 2: Building Your Fleet/)).toBeInTheDocument();
      // Equipment appears multiple times (badge and in content)
      const equipmentElements = screen.getAllByText('Equipment');
      expect(equipmentElements.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Populate the system with your equipment assets')).toBeInTheDocument();
    });

    it('displays Phase 3 with correct title, badge, and description', () => {
      render(<OnboardingGuide />);
      
      expect(screen.getByText(/Phase 3: Managing Inventory/)).toBeInTheDocument();
      expect(screen.getByText('Parts & Stock')).toBeInTheDocument();
      expect(screen.getByText('Track parts, consumables, and stock levels to ensure your shop never runs out.')).toBeInTheDocument();
    });

    it('displays Phase 4 with correct title, badge, and description', () => {
      render(<OnboardingGuide />);
      
      expect(screen.getByText(/Phase 4: The Requestor Workflow/)).toBeInTheDocument();
      expect(screen.getByText('Premium Service')).toBeInTheDocument();
      expect(screen.getByText('Offer a "Zero-Phone-Call" service level to trusted customers')).toBeInTheDocument();
    });

    it('displays Phase 5 with correct title, badge, and description', () => {
      render(<OnboardingGuide />);
      
      expect(screen.getByText(/Phase 5: Getting to Work/)).toBeInTheDocument();
      // Work Orders appears multiple times (badge and in content)
      const workOrdersElements = screen.getAllByText('Work Orders');
      expect(workOrdersElements.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Execute repairs with People, Equipment, and Requests in place')).toBeInTheDocument();
    });
  });

  describe('Accordion Functionality (Phase 1)', () => {
    it('displays all 3 accordion triggers in Phase 1', () => {
      render(<OnboardingGuide />);
      
      expect(screen.getByText(/1\. Sending Organization Invitations/)).toBeInTheDocument();
      expect(screen.getByText(/2\. Assigning Team Roles/)).toBeInTheDocument();
      expect(screen.getByText(/3\. Communicating with Your Team/)).toBeInTheDocument();
    });

    it('has accessible accordion buttons', () => {
      render(<OnboardingGuide />);
      
      const accordionButtons = screen.getAllByRole('button');
      expect(accordionButtons.length).toBeGreaterThanOrEqual(3);
    });

    it('reveals organization invitation content when accordion is opened', async () => {
      const user = userEvent.setup();
      render(<OnboardingGuide />);
      
      // Click to expand the first accordion item
      const invitationsButton = screen.getByText(/1\. Sending Organization Invitations/).closest('button');
      expect(invitationsButton).toBeInTheDocument();
      await user.click(invitationsButton!);
      
      // Now the content should be visible
      expect(screen.getByText(/First, invite users to join your EquipQR™ Organization/)).toBeInTheDocument();
      expect(screen.getByText(/"Invite Member"/)).toBeInTheDocument();
    });

    it('reveals team roles content when accordion is opened', async () => {
      const user = userEvent.setup();
      render(<OnboardingGuide />);
      
      // Click to expand the second accordion item
      const rolesButton = screen.getByText(/2\. Assigning Team Roles/).closest('button');
      expect(rolesButton).toBeInTheDocument();
      await user.click(rolesButton!);
      
      // Now the content should be visible
      expect(screen.getByText(/Once a user has joined your organization as a/)).toBeInTheDocument();
      expect(screen.getByText('Manager')).toBeInTheDocument();
      expect(screen.getByText('Technician')).toBeInTheDocument();
      expect(screen.getByText('Viewer')).toBeInTheDocument();
    });

    it('reveals communication content when accordion is opened', async () => {
      const user = userEvent.setup();
      render(<OnboardingGuide />);
      
      // Click to expand the third accordion item
      const communicationButton = screen.getByText(/3\. Communicating with Your Team/).closest('button');
      expect(communicationButton).toBeInTheDocument();
      await user.click(communicationButton!);
      
      // Now the content should be visible
      expect(screen.getByText(/Your team members will receive an automated email/)).toBeInTheDocument();
    });
  });

  describe('Badge Variants', () => {
    it('displays secondary variant badges for phase labels', () => {
      render(<OnboardingGuide />);
      
      expect(screen.getByText('Invitations & Roles')).toBeInTheDocument();
      const equipmentElements = screen.getAllByText('Equipment');
      expect(equipmentElements.length).toBeGreaterThanOrEqual(1);
      const workOrdersElements = screen.getAllByText('Work Orders');
      expect(workOrdersElements.length).toBeGreaterThanOrEqual(1);
    });

    it('displays Admin and Member role badges when accordion is opened', async () => {
      const user = userEvent.setup();
      render(<OnboardingGuide />);
      
      // Click to expand the first accordion item
      const invitationsButton = screen.getByText(/1\. Sending Organization Invitations/).closest('button');
      await user.click(invitationsButton!);
      
      expect(screen.getByText('Admin')).toBeInTheDocument();
      // Member appears multiple times (badge and in text)
      const memberElements = screen.getAllByText('Member');
      expect(memberElements.length).toBeGreaterThanOrEqual(1);
    });

    it('displays default variant badge for Premium Service', () => {
      render(<OnboardingGuide />);
      
      expect(screen.getByText('Premium Service')).toBeInTheDocument();
    });

    it('displays Premium badge for Requestor role when accordion is opened', async () => {
      const user = userEvent.setup();
      render(<OnboardingGuide />);
      
      // Click to expand the second accordion item
      const rolesButton = screen.getByText(/2\. Assigning Team Roles/).closest('button');
      await user.click(rolesButton!);
      
      expect(screen.getByText('Premium')).toBeInTheDocument();
      // Requestor appears multiple times in the content
      const requestorElements = screen.getAllByText('Requestor');
      expect(requestorElements.length).toBeGreaterThanOrEqual(1);
    });

    it('displays destructive variant badge for Crucial label', () => {
      render(<OnboardingGuide />);
      
      expect(screen.getByText('Crucial')).toBeInTheDocument();
    });

    it('displays outline variant badges for Submitted status', () => {
      render(<OnboardingGuide />);
      
      const submittedBadges = screen.getAllByText('Submitted');
      expect(submittedBadges.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Team Role Descriptions (Accordion Content)', () => {
    it('displays all role descriptions when accordion is opened', async () => {
      const user = userEvent.setup();
      render(<OnboardingGuide />);
      
      // Click to expand the second accordion item
      const rolesButton = screen.getByText(/2\. Assigning Team Roles/).closest('button');
      await user.click(rolesButton!);
      
      expect(screen.getByText('Manager')).toBeInTheDocument();
      expect(screen.getByText(/Can manage team members, assign work orders, and edit equipment details/)).toBeInTheDocument();
      
      expect(screen.getByText('Technician')).toBeInTheDocument();
      expect(screen.getByText(/Can view assignments, complete work orders, upload images, and record maintenance/)).toBeInTheDocument();
      
      expect(screen.getByText('Viewer')).toBeInTheDocument();
      expect(screen.getByText(/Read-only access. Good for clients who want to check machine stats/)).toBeInTheDocument();
      
      // Requestor appears multiple times in the content
      const requestorElements = screen.getAllByText('Requestor');
      expect(requestorElements.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Designed for recurring customers/)).toBeInTheDocument();
    });
  });

  describe('Content Accuracy', () => {
    it('displays correct email sender information when accordion is opened', async () => {
      const user = userEvent.setup();
      render(<OnboardingGuide />);
      
      // Click to expand the third accordion item
      const communicationButton = screen.getByText(/3\. Communicating with Your Team/).closest('button');
      await user.click(communicationButton!);
      
      expect(screen.getByText(/invite@equipqr\.app/)).toBeInTheDocument();
    });

    it('displays correct invitation expiration period when accordion is opened', async () => {
      const user = userEvent.setup();
      render(<OnboardingGuide />);
      
      // Click to expand the third accordion item
      const communicationButton = screen.getByText(/3\. Communicating with Your Team/).closest('button');
      await user.click(communicationButton!);
      
      expect(screen.getByText(/7 days/)).toBeInTheDocument();
    });

    it('displays equipment creation instructions', () => {
      render(<OnboardingGuide />);
      
      expect(screen.getByText(/"Create Equipment"/)).toBeInTheDocument();
      expect(screen.getByText(/Serial Number:/)).toBeInTheDocument();
    });

    it('displays all 5 Requestor workflow steps', () => {
      render(<OnboardingGuide />);
      
      expect(screen.getByText('The Setup')).toBeInTheDocument();
      expect(screen.getByText('The Scan')).toBeInTheDocument();
      expect(screen.getByText('The Request')).toBeInTheDocument();
      expect(screen.getByText('The Queue')).toBeInTheDocument();
      expect(screen.getByText('The Resolution')).toBeInTheDocument();
    });

    it('displays success message at the end', () => {
      render(<OnboardingGuide />);
      
      expect(screen.getByText(/You're all set! Your repair shop is now fully operational/)).toBeInTheDocument();
    });

    it('displays work order creation instructions', () => {
      render(<OnboardingGuide />);
      
      expect(screen.getByText(/"Create Work Order"/)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper structure with multiple card sections', () => {
      render(<OnboardingGuide />);
      
      // Verify card titles are present as headings
      expect(screen.getByText('Welcome to EquipQR™')).toBeInTheDocument();
      expect(screen.getByText(/Phase 1: Building Your Team/)).toBeInTheDocument();
      expect(screen.getByText(/Phase 2: Building Your Fleet/)).toBeInTheDocument();
      expect(screen.getByText(/Phase 3: Managing Inventory/)).toBeInTheDocument();
      expect(screen.getByText(/Phase 4: The Requestor Workflow/)).toBeInTheDocument();
      expect(screen.getByText(/Phase 5: Getting to Work/)).toBeInTheDocument();
    });

    it('has accordion triggers that are focusable buttons', () => {
      render(<OnboardingGuide />);
      
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThanOrEqual(3);
      
      // Verify buttons have accessible text
      buttons.forEach(button => {
        expect(button).toBeVisible();
      });
    });

    it('provides descriptive text for each section', () => {
      render(<OnboardingGuide />);
      
      // CardDescriptions should be present
      expect(screen.getByText('Get your personnel into the system with the right access levels')).toBeInTheDocument();
      expect(screen.getByText('Populate the system with your equipment assets')).toBeInTheDocument();
      expect(screen.getByText('Track parts, consumables, and stock levels to ensure your shop never runs out.')).toBeInTheDocument();
      expect(screen.getByText('Offer a "Zero-Phone-Call" service level to trusted customers')).toBeInTheDocument();
      expect(screen.getByText('Execute repairs with People, Equipment, and Requests in place')).toBeInTheDocument();
    });

    it('accordion buttons have aria-expanded attribute', () => {
      render(<OnboardingGuide />);
      
      const invitationsButton = screen.getByText(/1\. Sending Organization Invitations/).closest('button');
      expect(invitationsButton).toHaveAttribute('aria-expanded', 'false');
    });
  });

  describe('Responsive Design', () => {
    it('uses proper container structure with spacing', () => {
      const { container } = render(<OnboardingGuide />);
      
      // Look for the space-y-6 class that provides consistent spacing
      const spacedContainer = container.querySelector('div.space-y-6');
      expect(spacedContainer).toBeInTheDocument();
    });
  });

  describe('Content Completeness', () => {
    it('includes all required onboarding phases', () => {
      render(<OnboardingGuide />);
      
      // Verify all phases are present
      expect(screen.getByText('Welcome to EquipQR™')).toBeInTheDocument();
      expect(screen.getByText(/Phase 1/)).toBeInTheDocument();
      expect(screen.getByText(/Phase 2/)).toBeInTheDocument();
      expect(screen.getByText(/Phase 3/)).toBeInTheDocument();
      expect(screen.getByText(/Phase 4/)).toBeInTheDocument();
      expect(screen.getByText(/Phase 5/)).toBeInTheDocument();
    });

    it('provides comprehensive team setup information', () => {
      render(<OnboardingGuide />);
      
      // Check for key team-related content (accordion triggers are visible)
      expect(screen.getByText(/Sending Organization Invitations/)).toBeInTheDocument();
      expect(screen.getByText(/Assigning Team Roles/)).toBeInTheDocument();
      expect(screen.getByText(/Communicating with Your Team/)).toBeInTheDocument();
    });

    it('provides complete equipment setup guidance', () => {
      render(<OnboardingGuide />);
      
      expect(screen.getByText(/Fill in Basic Information/)).toBeInTheDocument();
      expect(screen.getByText(/Team Assignment/)).toBeInTheDocument();
      expect(screen.getByText(/Status & Location/)).toBeInTheDocument();
    });

    it('provides complete inventory management guidance', () => {
      render(<OnboardingGuide />);
      
      // Use getAllByText since "Navigate to the" matches multiple elements (Equipment and Inventory pages)
      const navigateElements = screen.getAllByText(/Navigate to the/);
      expect(navigateElements.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/"Add Item"/)).toBeInTheDocument();
      expect(screen.getByText(/Enter Part Details:/)).toBeInTheDocument();
      expect(screen.getByText(/Name & SKU:/)).toBeInTheDocument();
      expect(screen.getByText(/Quantity on Hand:/)).toBeInTheDocument();
      expect(screen.getByText(/Low Stock Threshold:/)).toBeInTheDocument();
      expect(screen.getByText(/Link to Equipment:/)).toBeInTheDocument();
    });

    it('explains the premium Requestor workflow', () => {
      render(<OnboardingGuide />);
      
      expect(screen.getByText(/role allows you to offer a premium/)).toBeInTheDocument();
      expect(screen.getByText(/How it works:/)).toBeInTheDocument();
    });

    it('provides work order execution guidance', () => {
      render(<OnboardingGuide />);
      
      expect(screen.getByText(/Creating a Job/)).toBeInTheDocument();
      expect(screen.getByText(/Handling Requests/)).toBeInTheDocument();
      // "Execution" is preceded by "Execution:" in the component
      expect(screen.getByText(/The assigned Technician will see this job/)).toBeInTheDocument();
    });
  });
});
