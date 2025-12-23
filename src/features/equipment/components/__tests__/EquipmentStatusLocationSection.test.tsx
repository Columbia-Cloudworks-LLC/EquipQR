import React from 'react';
import { render, screen, fireEvent, within } from '@/test/utils/test-utils';
import { describe, it, expect } from 'vitest';
import { useForm } from 'react-hook-form';
import EquipmentStatusLocationSection from '../form/EquipmentStatusLocationSection';
import { equipmentFormSchema, EquipmentFormData } from '@/features/equipment/types/equipment';
import { zodResolver } from '@hookform/resolvers/zod';

const TestWrapper = ({ defaultValues }: { defaultValues?: Partial<EquipmentFormData> }) => {
  const form = useForm<EquipmentFormData>({
    resolver: zodResolver(equipmentFormSchema),
    defaultValues: {
      name: '',
      manufacturer: '',
      model: '',
      serial_number: '',
      status: 'active',
      location: '',
      ...defaultValues
    }
  });

  return <EquipmentStatusLocationSection form={form} />;
};

describe('EquipmentStatusLocationSection', () => {
  describe('Core Rendering', () => {
    it('renders section title', () => {
      render(<TestWrapper />);
      
      expect(screen.getByText('Status & Location')).toBeInTheDocument();
    });

    it('renders status field', () => {
      render(<TestWrapper />);
      
      expect(screen.getByLabelText('Status *')).toBeInTheDocument();
    });

    it('renders location field', () => {
      render(<TestWrapper />);
      
      expect(screen.getByLabelText('Location *')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('e.g., Warehouse A, Section 1')).toBeInTheDocument();
    });

    it('renders installation date field', () => {
      render(<TestWrapper />);
      
      expect(screen.getByLabelText('Installation Date')).toBeInTheDocument();
    });

    it('renders warranty expiration field', () => {
      render(<TestWrapper />);
      
      expect(screen.getByLabelText('Warranty Expiration')).toBeInTheDocument();
    });

    it('renders last maintenance field', () => {
      render(<TestWrapper />);
      
      expect(screen.getByLabelText('Last Maintenance')).toBeInTheDocument();
    });
  });

  describe('Status Field', () => {
    it('shows all status options', async () => {
      render(<TestWrapper />);
      
      const statusSelect = screen.getByLabelText('Status *');
      fireEvent.click(statusSelect);
      
      const listbox = await screen.findByRole('listbox');
      expect(within(listbox).getByRole('option', { name: 'Active' })).toBeInTheDocument();
      expect(within(listbox).getByRole('option', { name: 'Under Maintenance' })).toBeInTheDocument();
      expect(within(listbox).getByRole('option', { name: 'Inactive' })).toBeInTheDocument();
    });

    it('displays current status value', () => {
      render(<TestWrapper defaultValues={{ status: 'maintenance' }} />);
      
      const statusSelect = screen.getByLabelText('Status *');
      expect(within(statusSelect).getByText('Under Maintenance')).toBeInTheDocument();
    });
  });

  describe('Date Fields', () => {
    it('renders date inputs with type="date"', () => {
      render(<TestWrapper />);
      
      const installationDate = screen.getByLabelText('Installation Date') as HTMLInputElement;
      const warrantyExpiration = screen.getByLabelText('Warranty Expiration') as HTMLInputElement;
      const lastMaintenance = screen.getByLabelText('Last Maintenance') as HTMLInputElement;
      
      expect(installationDate.type).toBe('date');
      expect(warrantyExpiration.type).toBe('date');
      expect(lastMaintenance.type).toBe('date');
    });

    it('displays date values when provided', () => {
      render(
        <TestWrapper 
          defaultValues={{
            installation_date: '2024-01-15',
            warranty_expiration: '2025-12-31',
            last_maintenance: '2024-06-01'
          }}
        />
      );
      
      const installationDate = screen.getByLabelText('Installation Date') as HTMLInputElement;
      const warrantyExpiration = screen.getByLabelText('Warranty Expiration') as HTMLInputElement;
      const lastMaintenance = screen.getByLabelText('Last Maintenance') as HTMLInputElement;
      
      expect(installationDate.value).toBe('2024-01-15');
      expect(warrantyExpiration.value).toBe('2025-12-31');
      expect(lastMaintenance.value).toBe('2024-06-01');
    });
  });

  describe('Layout', () => {
    it('renders in a Card component', () => {
      const { container } = render(<TestWrapper />);
      
      const card = container.querySelector('[class*="card"]');
      expect(card).toBeInTheDocument();
    });
  });
});
