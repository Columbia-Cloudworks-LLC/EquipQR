import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test/utils/test-utils';
import userEvent from '@testing-library/user-event';
import InventoryGuides from '../InventoryGuides';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('InventoryGuides', () => {
  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<InventoryGuides />);
      expect(screen.getByText('Inventory Management Guides')).toBeInTheDocument();
    });

    it('displays the introduction card with description', () => {
      render(<InventoryGuides />);
      expect(screen.getByText(/Step-by-step guides for managing parts/)).toBeInTheDocument();
    });

    it('displays all three feature highlights', () => {
      render(<InventoryGuides />);
      
      // Check for feature highlight descriptions which are unique
      expect(screen.getByText('Delegate inventory permissions to trusted team members')).toBeInTheDocument();
      expect(screen.getByText('Track parts with stock levels, compatibility, and QR codes')).toBeInTheDocument();
      expect(screen.getByText('Define interchangeable parts for flexible ordering')).toBeInTheDocument();
    });
  });

  describe('Guide 1: Parts Managers', () => {
    it('displays the Parts Managers guide section', () => {
      render(<InventoryGuides />);
      expect(screen.getByText('Guide 1: Setting Up Parts Managers')).toBeInTheDocument();
      expect(screen.getByText('Who Can Manage Inventory?')).toBeInTheDocument();
    });

    it('displays permission information', () => {
      render(<InventoryGuides />);
      expect(screen.getByText(/Owners & Admins/)).toBeInTheDocument();
      // Use actual text from the component
      expect(screen.getByText(/Always have full inventory access/)).toBeInTheDocument();
      expect(screen.getByText(/Regular Members/)).toBeInTheDocument();
    });

    it('expands Opening the Parts Managers Panel accordion', async () => {
      const user = userEvent.setup();
      render(<InventoryGuides />);
      
      const accordionTrigger = screen.getByText('Opening the Parts Managers Panel');
      await user.click(accordionTrigger);
      
      await waitFor(() => {
        expect(screen.getByText('Navigate to Inventory')).toBeInTheDocument();
      });
    });

    it('expands Adding a Parts Manager accordion', async () => {
      const user = userEvent.setup();
      render(<InventoryGuides />);
      
      const accordionTrigger = screen.getByText('Adding a Parts Manager');
      await user.click(accordionTrigger);
      
      await waitFor(() => {
        expect(screen.getByText('Click Add Manager')).toBeInTheDocument();
        expect(screen.getByText('Search and Select Members')).toBeInTheDocument();
        expect(screen.getByText('Confirm Selection')).toBeInTheDocument();
      });
    });

    it('expands Removing a Parts Manager accordion', async () => {
      const user = userEvent.setup();
      render(<InventoryGuides />);
      
      const accordionTrigger = screen.getByText('Removing a Parts Manager');
      await user.click(accordionTrigger);
      
      await waitFor(() => {
        expect(screen.getByText('Find the Manager')).toBeInTheDocument();
        expect(screen.getByText('Click the Remove Icon')).toBeInTheDocument();
        expect(screen.getByText('Confirm Removal')).toBeInTheDocument();
      });
    });
  });

  describe('Guide 2: Creating Inventory Items', () => {
    it('displays the Creating Inventory Items guide section', () => {
      render(<InventoryGuides />);
      expect(screen.getByText('Guide 2: Creating Inventory Items')).toBeInTheDocument();
    });

    it('expands Creating Your First Inventory Item accordion', async () => {
      const user = userEvent.setup();
      render(<InventoryGuides />);
      
      const accordionTrigger = screen.getByText('Creating Your First Inventory Item');
      await user.click(accordionTrigger);
      
      await waitFor(() => {
        expect(screen.getByText('Click Add Item')).toBeInTheDocument();
        expect(screen.getByText('Enter Basic Information')).toBeInTheDocument();
        expect(screen.getByText('Set Stock Levels')).toBeInTheDocument();
        expect(screen.getByText('Save the Item')).toBeInTheDocument();
      });
    });

    it('expands Setting Up Compatibility Rules accordion', async () => {
      const user = userEvent.setup();
      render(<InventoryGuides />);
      
      const accordionTrigger = screen.getByText('Setting Up Compatibility Rules');
      await user.click(accordionTrigger);
      
      await waitFor(() => {
        expect(screen.getByText('What are Compatibility Rules?')).toBeInTheDocument();
        expect(screen.getByText('Open the Compatibility Rules Section')).toBeInTheDocument();
        expect(screen.getByText('Select a Manufacturer')).toBeInTheDocument();
        expect(screen.getByText('Choose a Match Type')).toBeInTheDocument();
      });
    });

    it('expands Adjusting Quantity accordion', async () => {
      const user = userEvent.setup();
      render(<InventoryGuides />);
      
      const accordionTrigger = screen.getByText('Adjusting Quantity & Viewing History');
      await user.click(accordionTrigger);
      
      await waitFor(() => {
        expect(screen.getByText('Open the Item Detail Page')).toBeInTheDocument();
        expect(screen.getByText('Click Adjust Quantity')).toBeInTheDocument();
        expect(screen.getByText('Add or Take Stock')).toBeInTheDocument();
        expect(screen.getByText('View Transaction History')).toBeInTheDocument();
      });
    });

    it('expands Using Inventory QR Codes accordion', async () => {
      const user = userEvent.setup();
      render(<InventoryGuides />);
      
      const accordionTrigger = screen.getByText('Using Inventory QR Codes');
      await user.click(accordionTrigger);
      
      await waitFor(() => {
        expect(screen.getByText('Access the QR Code')).toBeInTheDocument();
        expect(screen.getByText('Print or Download')).toBeInTheDocument();
        expect(screen.getByText('Scan to Access')).toBeInTheDocument();
      });
    });
  });

  describe('Guide 3: Alternate Groups', () => {
    it('displays the Alternate Groups guide section', () => {
      render(<InventoryGuides />);
      expect(screen.getByText('Guide 3: Creating Alternate Part Groups')).toBeInTheDocument();
      expect(screen.getByText('What are Alternate Groups?')).toBeInTheDocument();
    });

    it('displays alternate groups explanation', () => {
      render(<InventoryGuides />);
      expect(screen.getByText(/groups let you define which parts can substitute/)).toBeInTheDocument();
    });

    it('expands Creating an Alternate Group accordion', async () => {
      const user = userEvent.setup();
      render(<InventoryGuides />);
      
      const accordionTrigger = screen.getByText('Creating an Alternate Group');
      await user.click(accordionTrigger);
      
      await waitFor(() => {
        expect(screen.getByText('Navigate to Part Alternates')).toBeInTheDocument();
        expect(screen.getByText('Click New Group')).toBeInTheDocument();
        expect(screen.getByText('Enter Group Details')).toBeInTheDocument();
        expect(screen.getByText('Save the Group')).toBeInTheDocument();
      });
    });

    it('expands Adding Inventory Items to a Group accordion', async () => {
      const user = userEvent.setup();
      render(<InventoryGuides />);
      
      const accordionTrigger = screen.getByText('Adding Inventory Items to a Group');
      await user.click(accordionTrigger);
      
      await waitFor(() => {
        expect(screen.getByText('Open the Group Detail Page')).toBeInTheDocument();
        expect(screen.getByText('Click Add Item')).toBeInTheDocument();
        expect(screen.getByText('Search and Select')).toBeInTheDocument();
        expect(screen.getByText('Mark as Primary (Optional)')).toBeInTheDocument();
        expect(screen.getByText('Confirm Addition')).toBeInTheDocument();
      });
    });

    it('expands Adding Part Numbers accordion', async () => {
      const user = userEvent.setup();
      render(<InventoryGuides />);
      
      const accordionTrigger = screen.getByText('Adding Part Numbers (OEM/Aftermarket)');
      await user.click(accordionTrigger);
      
      await waitFor(() => {
        expect(screen.getByText(/Why add part numbers?/)).toBeInTheDocument();
        expect(screen.getByText('Click Add Part Number')).toBeInTheDocument();
        expect(screen.getByText('Select the Type')).toBeInTheDocument();
        expect(screen.getByText('Enter the Part Number')).toBeInTheDocument();
        expect(screen.getByText('Save the Part Number')).toBeInTheDocument();
      });
    });

    it('expands Verifying an Alternate Group accordion', async () => {
      const user = userEvent.setup();
      render(<InventoryGuides />);
      
      const accordionTrigger = screen.getByText('Verifying an Alternate Group');
      await user.click(accordionTrigger);
      
      await waitFor(() => {
        expect(screen.getByText('Click Edit Group')).toBeInTheDocument();
        expect(screen.getByText('Change Status to Verified')).toBeInTheDocument();
        expect(screen.getByText('Add Verification Notes')).toBeInTheDocument();
        expect(screen.getByText('Save Changes')).toBeInTheDocument();
      });
    });
  });

  describe('Summary Card', () => {
    it('displays the summary card', () => {
      render(<InventoryGuides />);
      expect(screen.getByText("You're Ready!")).toBeInTheDocument();
    });

    it('displays summary points', () => {
      render(<InventoryGuides />);
      expect(screen.getByText('Delegate permissions with Parts Managers')).toBeInTheDocument();
      expect(screen.getByText('Track stock with smart low-level alerts')).toBeInTheDocument();
      expect(screen.getByText('Find alternatives with Alternate Groups')).toBeInTheDocument();
    });
  });

  describe('GuideStep Component', () => {
    it('renders steps with numbers', async () => {
      const user = userEvent.setup();
      render(<InventoryGuides />);
      
      // Open an accordion to see numbered steps
      const accordionTrigger = screen.getByText('Opening the Parts Managers Panel');
      await user.click(accordionTrigger);
      
      await waitFor(() => {
        // Steps are numbered 1, 2
        const stepNumbers = screen.getAllByText('1');
        expect(stepNumbers.length).toBeGreaterThan(0);
      });
    });

    it('renders step descriptions', async () => {
      const user = userEvent.setup();
      render(<InventoryGuides />);
      
      const accordionTrigger = screen.getByText('Adding a Parts Manager');
      await user.click(accordionTrigger);
      
      await waitFor(() => {
        expect(screen.getByText(/In the Parts Managers panel/)).toBeInTheDocument();
        expect(screen.getByText(/Use the search field to find team members/)).toBeInTheDocument();
      });
    });

    it('renders steps with different highlight states', async () => {
      const user = userEvent.setup();
      render(<InventoryGuides />);
      
      // Open accordion to see step with success highlight
      const accordionTrigger = screen.getByText('Adding a Parts Manager');
      await user.click(accordionTrigger);
      
      await waitFor(() => {
        // The "Confirm Selection" step has highlight="success"
        expect(screen.getByText('Confirm Selection')).toBeInTheDocument();
      });
    });
  });

  describe('FeatureHighlight Component', () => {
    it('renders feature highlights with icons and descriptions', () => {
      render(<InventoryGuides />);
      
      // Check that all three unique feature descriptions are present
      // These descriptions are unique to the FeatureHighlight components
      expect(screen.getByText('Delegate inventory permissions to trusted team members')).toBeInTheDocument();
      expect(screen.getByText('Track parts with stock levels, compatibility, and QR codes')).toBeInTheDocument();
      expect(screen.getByText('Define interchangeable parts for flexible ordering')).toBeInTheDocument();
    });
  });

  describe('Match Type Badges', () => {
    it('displays match type badges in compatibility rules', async () => {
      const user = userEvent.setup();
      render(<InventoryGuides />);
      
      const accordionTrigger = screen.getByText('Setting Up Compatibility Rules');
      await user.click(accordionTrigger);
      
      await waitFor(() => {
        expect(screen.getByText('Any Model')).toBeInTheDocument();
        expect(screen.getByText('Exact')).toBeInTheDocument();
        expect(screen.getByText('Starts With')).toBeInTheDocument();
        expect(screen.getByText('Pattern')).toBeInTheDocument();
      });
    });
  });

  describe('Part Identifier Types', () => {
    it('displays part identifier types in add part number section', async () => {
      const user = userEvent.setup();
      render(<InventoryGuides />);
      
      const accordionTrigger = screen.getByText('Adding Part Numbers (OEM/Aftermarket)');
      await user.click(accordionTrigger);
      
      await waitFor(() => {
        expect(screen.getByText('OEM Part Number')).toBeInTheDocument();
        expect(screen.getByText('Aftermarket')).toBeInTheDocument();
        expect(screen.getByText('Manufacturer PN')).toBeInTheDocument();
        expect(screen.getByText('UPC Code')).toBeInTheDocument();
        expect(screen.getByText('Cross-Reference')).toBeInTheDocument();
      });
    });
  });


  describe('Verification Status', () => {
    it('displays verification status badges', async () => {
      const user = userEvent.setup();
      render(<InventoryGuides />);
      
      const accordionTrigger = screen.getByText('Setting Up Compatibility Rules');
      await user.click(accordionTrigger);
      
      await waitFor(() => {
        expect(screen.getByText('Unverified')).toBeInTheDocument();
        // Verified appears multiple times (in badges and groups)
        const verifiedElements = screen.getAllByText('Verified');
        expect(verifiedElements.length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText('Deprecated')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper heading structure', () => {
      render(<InventoryGuides />);
      
      // Main title
      expect(screen.getByRole('heading', { name: /Inventory Management Guides/ })).toBeInTheDocument();
    });

    it('accordion triggers are accessible', () => {
      render(<InventoryGuides />);
      
      // Accordions should be buttons
      const accordionTriggers = screen.getAllByRole('button');
      expect(accordionTriggers.length).toBeGreaterThan(0);
    });
  });
});
