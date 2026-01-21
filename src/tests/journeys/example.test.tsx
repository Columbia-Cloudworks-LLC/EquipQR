/**
 * Example Journey Test
 * 
 * This file demonstrates the correct pattern for writing journey tests.
 * Use this as a template for new journey tests.
 * 
 * Key principles:
 * - Render real components (not test stubs)
 * - Use userEvent for interactions
 * - Assert on visible outcomes
 * - Mock only at external boundaries (Supabase)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { screen, waitFor } from '@testing-library/react';
import { 
  renderJourney, 
  resetSupabaseMock, 
  seedSupabaseMock,
  setSupabaseError,
  equipment,
  workOrders,
  teams,
} from '@/test/journey';

// A simple test component for demonstration purposes
// In real tests, you would import the actual page component
const TestEquipmentList = () => {
  return (
    <div>
      <h1>Equipment List</h1>
      <p data-testid="equipment-count">Total: 5 items</p>
      <button>Add Equipment</button>
    </div>
  );
};

describe('Example Journey Test', () => {
  // Note: TestEquipmentList is intentionally simplified for demonstration purposes.
  // In real journey tests, import actual page components from src/pages/.
  beforeEach(() => {
    // Always reset mock state for test isolation
    resetSupabaseMock();
  });

  describe('Pattern 1: Basic rendering with seeded data', () => {
    beforeEach(() => {
      // Seed the mock database with fixture data
      seedSupabaseMock({
        equipment: Object.values(equipment),
        work_orders: Object.values(workOrders),
        teams: Object.values(teams),
      });
    });

    it('renders the page for an admin user', async () => {
      renderJourney({
        persona: 'admin',
        route: '/dashboard/equipment',
        element: <TestEquipmentList />,
      });

      // Assert on visible content
      expect(screen.getByRole('heading', { name: /equipment list/i })).toBeInTheDocument();
      expect(screen.getByTestId('equipment-count')).toHaveTextContent('5 items');
    });

    it('renders the page for a technician user', async () => {
      renderJourney({
        persona: 'technician',
        route: '/dashboard/equipment',
        element: <TestEquipmentList />,
      });

      expect(screen.getByRole('heading', { name: /equipment list/i })).toBeInTheDocument();
    });
  });

  describe('Pattern 2: User interactions with userEvent', () => {
    it('handles button clicks', async () => {
      const user = userEvent.setup();
      
      renderJourney({
        persona: 'admin',
        route: '/dashboard/equipment',
        element: <TestEquipmentList />,
      });

      // Find and click a button
      const button = screen.getByRole('button', { name: /add equipment/i });
      expect(button).toBeInTheDocument();

      await user.click(button);

      // In a real test, you would assert on the outcome
      // e.g., a modal appearing or navigation changing
    });
  });

  describe('Pattern 3: Testing error states', () => {
    it('handles API errors gracefully', async () => {
      // Configure the mock to return an error
      setSupabaseError('equipment', { message: 'Network error' });

      renderJourney({
        persona: 'admin',
        route: '/dashboard/equipment',
        element: <TestEquipmentList />,
      });

      // In a real test with actual data fetching, you would assert:
      // expect(await screen.findByText(/failed to load/i)).toBeInTheDocument();
      
      // For this demo, just verify the page renders
      expect(screen.getByRole('heading')).toBeInTheDocument();
    });
  });

  describe('Pattern 4: Waiting for async content', () => {
    beforeEach(() => {
      seedSupabaseMock({
        equipment: [equipment.forklift1],
      });
    });

    it('waits for data to load before assertions', async () => {
      renderJourney({
        persona: 'admin',
        route: '/dashboard/equipment',
        element: <TestEquipmentList />,
      });

      // Use findBy* for async content (includes implicit waitFor)
      const heading = await screen.findByRole('heading', { name: /equipment list/i });
      expect(heading).toBeInTheDocument();

      // Or use explicit waitFor for complex conditions
      await waitFor(() => {
        expect(screen.getByTestId('equipment-count')).toBeInTheDocument();
      });
    });
  });

  describe('Pattern 5: Testing role-based access', () => {
    it('shows different content based on user role', async () => {
      // Admin sees Add button
      const { unmount } = renderJourney({
        persona: 'admin',
        route: '/dashboard/equipment',
        element: <TestEquipmentList />,
      });

      expect(screen.getByRole('button', { name: /add equipment/i })).toBeInTheDocument();
      
      // Clean up before re-rendering
      unmount();

      // In a real app, viewer might not see the Add button
      // This demonstrates how to test different personas
      renderJourney({
        persona: 'viewer',
        route: '/dashboard/equipment',
        element: <TestEquipmentList />,
      });

      // The button is still visible in this demo, but in a real test
      // you would assert that certain actions are hidden for viewers
      expect(screen.getByRole('heading')).toBeInTheDocument();
    });
  });
});

/**
 * Tips for writing good journey tests:
 * 
 * 1. Keep tests focused on one user story or flow
 * 2. Name tests as user actions: "allows admin to create equipment"
 * 3. Use findBy* queries for async content
 * 4. Prefer getByRole over getByTestId for accessibility
 * 5. Seed only the data needed for the specific test
 * 6. Don't over-test - one assertion per behavior is often enough
 */
