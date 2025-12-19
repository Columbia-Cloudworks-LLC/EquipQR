import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/utils/test-utils';
import userEvent from '@testing-library/user-event';
import SupportTabs from '../SupportTabs';

describe('SupportTabs', () => {
  describe('Tab Structure', () => {
    it('renders without crashing', () => {
      render(<SupportTabs />);
      expect(screen.getByRole('tablist')).toBeInTheDocument();
    });

    it('displays all four tab triggers', () => {
      render(<SupportTabs />);
      
      expect(screen.getByRole('tab', { name: /Guide/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /FAQ/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Roles/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Tips/i })).toBeInTheDocument();
    });

    it('sets Guide tab as default active tab', () => {
      render(<SupportTabs />);
      
      const guideTab = screen.getByRole('tab', { name: /Guide/i });
      expect(guideTab).toHaveAttribute('data-state', 'active');
    });
  });

  describe('Tab Switching', () => {
    it('switches to FAQ tab when clicked', async () => {
      const user = userEvent.setup();
      render(<SupportTabs />);
      
      const faqTab = screen.getByRole('tab', { name: /FAQ/i });
      await user.click(faqTab);
      
      expect(faqTab).toHaveAttribute('data-state', 'active');
      expect(screen.getByText('Frequently Asked Questions')).toBeInTheDocument();
    });

    it('switches to Roles tab when clicked', async () => {
      const user = userEvent.setup();
      render(<SupportTabs />);
      
      const rolesTab = screen.getByRole('tab', { name: /Roles/i });
      await user.click(rolesTab);
      
      expect(rolesTab).toHaveAttribute('data-state', 'active');
      expect(screen.getByText('Organization-Level Roles')).toBeInTheDocument();
    });

    it('switches to Tips tab when clicked', async () => {
      const user = userEvent.setup();
      render(<SupportTabs />);
      
      const tipsTab = screen.getByRole('tab', { name: /Tips/i });
      await user.click(tipsTab);
      
      expect(tipsTab).toHaveAttribute('data-state', 'active');
      expect(screen.getByText('Best Practices')).toBeInTheDocument();
    });
  });

  describe('Guide Tab Content (OnboardingGuide)', () => {
    it('displays OnboardingGuide component by default', () => {
      render(<SupportTabs />);
      
      expect(screen.getByText('Welcome to EquipQR™')).toBeInTheDocument();
    });
  });

  describe('FAQ Tab Content', () => {
    it('displays FAQ section with correct title', async () => {
      const user = userEvent.setup();
      render(<SupportTabs />);
      
      const faqTab = screen.getByRole('tab', { name: /FAQ/i });
      await user.click(faqTab);
      
      expect(screen.getByText('Frequently Asked Questions')).toBeInTheDocument();
    });

    it('displays all FAQ accordion items', async () => {
      const user = userEvent.setup();
      render(<SupportTabs />);
      
      const faqTab = screen.getByRole('tab', { name: /FAQ/i });
      await user.click(faqTab);
      
      expect(screen.getByText(/How do I get started with EquipQR™?/)).toBeInTheDocument();
      expect(screen.getByText(/How do QR codes work in EquipQR™?/)).toBeInTheDocument();
      expect(screen.getByText(/What are Teams in EquipQR™?/)).toBeInTheDocument();
      expect(screen.getByText(/How do Work Orders work?/)).toBeInTheDocument();
      expect(screen.getByText(/What's the difference between Organization and Team Members?/)).toBeInTheDocument();
    });

    it('expands FAQ accordion when clicked', async () => {
      const user = userEvent.setup();
      render(<SupportTabs />);
      
      const faqTab = screen.getByRole('tab', { name: /FAQ/i });
      await user.click(faqTab);
      
      const gettingStartedButton = screen.getByText(/How do I get started with EquipQR™?/).closest('button');
      await user.click(gettingStartedButton!);
      
      expect(screen.getByText('Getting started with EquipQR™ is easy:')).toBeInTheDocument();
      expect(screen.getByText(/Set up your organization and invite team members/)).toBeInTheDocument();
    });
  });

  describe('Roles Tab Content', () => {
    it('displays roles section with correct title', async () => {
      const user = userEvent.setup();
      render(<SupportTabs />);
      
      const rolesTab = screen.getByRole('tab', { name: /Roles/i });
      await user.click(rolesTab);
      
      expect(screen.getByText('Organization-Level Roles')).toBeInTheDocument();
    });

    it('displays all organization-level role cards', async () => {
      const user = userEvent.setup();
      render(<SupportTabs />);
      
      const rolesTab = screen.getByRole('tab', { name: /Roles/i });
      await user.click(rolesTab);
      
      expect(screen.getByText('Owner')).toBeInTheDocument();
      expect(screen.getByText('Admin')).toBeInTheDocument();
      expect(screen.getByText('Member')).toBeInTheDocument();
    });

    it('displays team-level roles section', async () => {
      const user = userEvent.setup();
      render(<SupportTabs />);
      
      const rolesTab = screen.getByRole('tab', { name: /Roles/i });
      await user.click(rolesTab);
      
      expect(screen.getByText('Team-Level Roles')).toBeInTheDocument();
      expect(screen.getByText('Manager')).toBeInTheDocument();
      expect(screen.getByText('Technician')).toBeInTheDocument();
      expect(screen.getByText('Viewer')).toBeInTheDocument();
      expect(screen.getByText('Requestor')).toBeInTheDocument();
    });

    it('displays role hierarchy visualization', async () => {
      const user = userEvent.setup();
      render(<SupportTabs />);
      
      const rolesTab = screen.getByRole('tab', { name: /Roles/i });
      await user.click(rolesTab);
      
      expect(screen.getByText('Role Hierarchy Visualization')).toBeInTheDocument();
      expect(screen.getByText(/Your Organization/)).toBeInTheDocument();
    });
  });

  describe('Tips Tab Content', () => {
    it('displays best practices section with correct title', async () => {
      const user = userEvent.setup();
      render(<SupportTabs />);
      
      const tipsTab = screen.getByRole('tab', { name: /Tips/i });
      await user.click(tipsTab);
      
      expect(screen.getByText('Best Practices')).toBeInTheDocument();
    });

    it('displays equipment management best practices', async () => {
      const user = userEvent.setup();
      render(<SupportTabs />);
      
      const tipsTab = screen.getByRole('tab', { name: /Tips/i });
      await user.click(tipsTab);
      
      expect(screen.getByText('Equipment Management')).toBeInTheDocument();
      expect(screen.getByText(/Keep equipment records up to date/)).toBeInTheDocument();
      expect(screen.getByText(/Attach QR codes to physical equipment/)).toBeInTheDocument();
    });

    it('displays team organization best practices', async () => {
      const user = userEvent.setup();
      render(<SupportTabs />);
      
      const tipsTab = screen.getByRole('tab', { name: /Tips/i });
      await user.click(tipsTab);
      
      expect(screen.getByText('Team Organization')).toBeInTheDocument();
      expect(screen.getByText(/Create separate Teams for each major customer/)).toBeInTheDocument();
      expect(screen.getByText(/Assign equipment to Teams based on location or customer/)).toBeInTheDocument();
    });

    it('displays work order workflow best practices', async () => {
      const user = userEvent.setup();
      render(<SupportTabs />);
      
      const tipsTab = screen.getByRole('tab', { name: /Tips/i });
      await user.click(tipsTab);
      
      expect(screen.getByText('Work Order Workflow')).toBeInTheDocument();
      expect(screen.getByText(/Use descriptive titles and detailed descriptions/)).toBeInTheDocument();
      expect(screen.getByText(/Set realistic due dates/)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper tab navigation structure', () => {
      render(<SupportTabs />);
      
      const tablist = screen.getByRole('tablist');
      expect(tablist).toBeInTheDocument();
      
      const tabs = screen.getAllByRole('tab');
      expect(tabs).toHaveLength(4);
    });

    it('tabs have correct aria-selected attributes', () => {
      render(<SupportTabs />);
      
      const guideTab = screen.getByRole('tab', { name: /Guide/i });
      const faqTab = screen.getByRole('tab', { name: /FAQ/i });
      
      expect(guideTab).toHaveAttribute('aria-selected', 'true');
      expect(faqTab).toHaveAttribute('aria-selected', 'false');
    });

    it('tab panels have proper role attributes', () => {
      render(<SupportTabs />);
      
      const tabPanels = screen.getAllByRole('tabpanel');
      expect(tabPanels.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Responsive Design', () => {
    it('uses grid layout for tab triggers', () => {
      const { container } = render(<SupportTabs />);
      
      const tabsList = container.querySelector('[role="tablist"]');
      expect(tabsList).toHaveClass('grid');
      expect(tabsList).toHaveClass('grid-cols-4');
    });

    it('applies proper spacing to tab content', () => {
      const { container } = render(<SupportTabs />);
      
      const tabContent = container.querySelector('[role="tabpanel"]');
      expect(tabContent).toHaveClass('mt-6');
    });
  });

  describe('Content Completeness', () => {
    it('includes all required sections across all tabs', async () => {
      const user = userEvent.setup();
      render(<SupportTabs />);
      
      // Guide tab (default)
      expect(screen.getByText('Welcome to EquipQR™')).toBeInTheDocument();
      
      // FAQ tab
      const faqTab = screen.getByRole('tab', { name: /FAQ/i });
      await user.click(faqTab);
      expect(screen.getByText('Frequently Asked Questions')).toBeInTheDocument();
      
      // Roles tab
      const rolesTab = screen.getByRole('tab', { name: /Roles/i });
      await user.click(rolesTab);
      expect(screen.getByText('Organization-Level Roles')).toBeInTheDocument();
      
      // Tips tab
      const tipsTab = screen.getByRole('tab', { name: /Tips/i });
      await user.click(tipsTab);
      expect(screen.getByText('Best Practices')).toBeInTheDocument();
    });
  });
});
