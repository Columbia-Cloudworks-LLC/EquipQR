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

    it('displays all 5 tab triggers', () => {
      render(<SupportTabs />);
      
      expect(screen.getByRole('tab', { name: /^Guide$/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /^Guides$/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /faq/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /roles/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /tips/i })).toBeInTheDocument();
    });

    it('has Guide tab selected by default', () => {
      render(<SupportTabs />);
      
      const guideTab = screen.getByRole('tab', { name: /^Guide$/i });
      expect(guideTab).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('Tab Navigation', () => {
    it('switches to FAQ tab when clicked', async () => {
      const user = userEvent.setup();
      render(<SupportTabs />);
      
      const faqTab = screen.getByRole('tab', { name: /faq/i });
      await user.click(faqTab);
      
      expect(faqTab).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByText('Frequently Asked Questions')).toBeInTheDocument();
    });

    it('switches to Roles tab when clicked', async () => {
      const user = userEvent.setup();
      render(<SupportTabs />);
      
      const rolesTab = screen.getByRole('tab', { name: /roles/i });
      await user.click(rolesTab);
      
      expect(rolesTab).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByText('Organization Roles (Internal Staff)')).toBeInTheDocument();
    });

    it('switches to Tips tab when clicked', async () => {
      const user = userEvent.setup();
      render(<SupportTabs />);
      
      const tipsTab = screen.getByRole('tab', { name: /tips/i });
      await user.click(tipsTab);
      
      expect(tipsTab).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByText('Best Practices')).toBeInTheDocument();
    });
  });

  describe('Guide Tab Content', () => {
    it('displays OnboardingGuide content by default', () => {
      render(<SupportTabs />);
      
      // OnboardingGuide welcome message should be visible
      expect(screen.getByText('Welcome to EquipQR™')).toBeInTheDocument();
    });
  });

  describe('FAQ Tab Content', () => {
    it('displays FAQ accordion items when FAQ tab is selected', async () => {
      const user = userEvent.setup();
      render(<SupportTabs />);
      
      await user.click(screen.getByRole('tab', { name: /faq/i }));
      
      expect(screen.getByText('How do I get started with EquipQR™?')).toBeInTheDocument();
      expect(screen.getByText('How do QR codes work in EquipQR™?')).toBeInTheDocument();
      expect(screen.getByText('How do I manage work orders effectively?')).toBeInTheDocument();
      expect(screen.getByText('How do I organize teams and permissions?')).toBeInTheDocument();
    });

    it('expands FAQ accordion items when clicked', async () => {
      const user = userEvent.setup();
      render(<SupportTabs />);
      
      await user.click(screen.getByRole('tab', { name: /faq/i }));
      
      const gettingStartedButton = screen.getByText('How do I get started with EquipQR™?').closest('button');
      expect(gettingStartedButton).toBeInTheDocument();
      await user.click(gettingStartedButton!);
      
      expect(screen.getByText('Getting started with EquipQR™ is easy:')).toBeInTheDocument();
    });
  });

  describe('Roles Tab Content', () => {
    it('displays organization role cards when Roles tab is selected', async () => {
      const user = userEvent.setup();
      render(<SupportTabs />);
      
      await user.click(screen.getByRole('tab', { name: /roles/i }));
      
      // These roles appear multiple times (in cards and hierarchy example)
      const ownerElements = screen.getAllByText('Owner');
      expect(ownerElements.length).toBeGreaterThanOrEqual(1);
      const adminElements = screen.getAllByText('Admin');
      expect(adminElements.length).toBeGreaterThanOrEqual(1);
      const memberElements = screen.getAllByText('Member');
      expect(memberElements.length).toBeGreaterThanOrEqual(1);
    });

    it('displays the hierarchy example when Roles tab is selected', async () => {
      const user = userEvent.setup();
      render(<SupportTabs />);
      
      await user.click(screen.getByRole('tab', { name: /roles/i }));
      
      expect(screen.getByText('Example Structure: "Apex Repair Services"')).toBeInTheDocument();
      expect(screen.getByText('Apex Repair Services')).toBeInTheDocument();
    });

    it('displays team role definitions table when Roles tab is selected', async () => {
      const user = userEvent.setup();
      render(<SupportTabs />);
      
      await user.click(screen.getByRole('tab', { name: /roles/i }));
      
      expect(screen.getByText('Team Role Definitions')).toBeInTheDocument();
      // Manager appears multiple times (in hierarchy and table)
      const managerElements = screen.getAllByText('Manager');
      expect(managerElements.length).toBeGreaterThanOrEqual(1);
      // Technician appears multiple times
      const technicianElements = screen.getAllByText('Technician');
      expect(technicianElements.length).toBeGreaterThanOrEqual(1);
      // Requestor appears multiple times
      const requestorElements = screen.getAllByText('Requestor');
      expect(requestorElements.length).toBeGreaterThanOrEqual(1);
      // Viewer appears multiple times
      const viewerElements = screen.getAllByText('Viewer');
      expect(viewerElements.length).toBeGreaterThanOrEqual(1);
    });

    it('displays common questions when Roles tab is selected', async () => {
      const user = userEvent.setup();
      render(<SupportTabs />);
      
      await user.click(screen.getByRole('tab', { name: /roles/i }));
      
      expect(screen.getByText('Can a technician be in multiple teams?')).toBeInTheDocument();
      expect(screen.getByText("Can customers see other customers' data?")).toBeInTheDocument();
    });
  });

  describe('Tips Tab Content', () => {
    it('displays best practices content when Tips tab is selected', async () => {
      const user = userEvent.setup();
      render(<SupportTabs />);
      
      await user.click(screen.getByRole('tab', { name: /tips/i }));
      
      expect(screen.getByText('Equipment Management')).toBeInTheDocument();
      expect(screen.getByText('Work Order Efficiency')).toBeInTheDocument();
      expect(screen.getByText('Team Collaboration')).toBeInTheDocument();
    });

    it('displays tips for equipment management', async () => {
      const user = userEvent.setup();
      render(<SupportTabs />);
      
      await user.click(screen.getByRole('tab', { name: /tips/i }));
      
      expect(screen.getByText(/Keep equipment information up-to-date/)).toBeInTheDocument();
      expect(screen.getByText(/Add detailed notes and photos/)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA roles for tabs', () => {
      render(<SupportTabs />);
      
      expect(screen.getByRole('tablist')).toBeInTheDocument();
      expect(screen.getAllByRole('tab')).toHaveLength(5);
    });

    it('has proper aria-selected states', async () => {
      const user = userEvent.setup();
      render(<SupportTabs />);
      
      const guideTab = screen.getByRole('tab', { name: /^Guide$/i });
      const faqTab = screen.getByRole('tab', { name: /faq/i });
      
      // Initially Guide is selected
      expect(guideTab).toHaveAttribute('aria-selected', 'true');
      expect(faqTab).toHaveAttribute('aria-selected', 'false');
      
      // After clicking FAQ
      await user.click(faqTab);
      expect(guideTab).toHaveAttribute('aria-selected', 'false');
      expect(faqTab).toHaveAttribute('aria-selected', 'true');
    });

    it('tab panels have proper tabpanel role', () => {
      render(<SupportTabs />);
      
      const tabpanels = screen.getAllByRole('tabpanel');
      expect(tabpanels.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Responsive Design', () => {
    it('uses proper grid layout for tabs', () => {
      const { container } = render(<SupportTabs />);
      
      const tabsList = container.querySelector('[role="tablist"]');
      expect(tabsList).toHaveClass('grid', 'grid-cols-5');
    });
  });
});
