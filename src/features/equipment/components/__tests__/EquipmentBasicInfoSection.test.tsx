import React from 'react';
import { render, screen } from '@/test/utils/test-utils';
import { describe, it, expect } from 'vitest';
import { useForm } from 'react-hook-form';
import EquipmentBasicInfoSection from '../form/EquipmentBasicInfoSection';
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

  return <EquipmentBasicInfoSection form={form} />;
};

describe('EquipmentBasicInfoSection', () => {
  describe('Core Rendering', () => {
    it('renders section title', () => {
      render(<TestWrapper />);
      
      expect(screen.getByText('Basic Information')).toBeInTheDocument();
    });

    it('renders name field', () => {
      render(<TestWrapper />);
      
      expect(screen.getByLabelText('Equipment Name *')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('e.g., Forklift FL-001')).toBeInTheDocument();
    });

    it('renders manufacturer field', () => {
      render(<TestWrapper />);
      
      expect(screen.getByLabelText('Manufacturer *')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('e.g., Toyota')).toBeInTheDocument();
    });

    it('renders model field', () => {
      render(<TestWrapper />);
      
      expect(screen.getByLabelText('Model *')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('e.g., 8FBU25')).toBeInTheDocument();
    });

    it('renders serial number field', () => {
      render(<TestWrapper />);
      
      expect(screen.getByLabelText('Serial Number *')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('e.g., 12345678')).toBeInTheDocument();
    });
  });

  describe('Form Field Values', () => {
    it('displays default values', () => {
      render(
        <TestWrapper 
          defaultValues={{
            name: 'Test Equipment',
            manufacturer: 'Test Manufacturer',
            model: 'Test Model',
            serial_number: 'TEST123'
          }}
        />
      );
      
      const nameInput = screen.getByLabelText('Equipment Name *') as HTMLInputElement;
      const manufacturerInput = screen.getByLabelText('Manufacturer *') as HTMLInputElement;
      const modelInput = screen.getByLabelText('Model *') as HTMLInputElement;
      const serialInput = screen.getByLabelText('Serial Number *') as HTMLInputElement;
      
      expect(nameInput.value).toBe('Test Equipment');
      expect(manufacturerInput.value).toBe('Test Manufacturer');
      expect(modelInput.value).toBe('Test Model');
      expect(serialInput.value).toBe('TEST123');
    });
  });

  describe('Layout', () => {
    it('renders in a Card component', () => {
      const { container } = render(<TestWrapper />);
      
      const card = container.querySelector('[class*="card"]');
      expect(card).toBeInTheDocument();
    });

    it('applies proper spacing classes', () => {
      const { container } = render(<TestWrapper />);
      
      const cardContent = container.querySelector('[class*="space-y-4"]');
      expect(cardContent).toBeInTheDocument();
    });
  });
});
