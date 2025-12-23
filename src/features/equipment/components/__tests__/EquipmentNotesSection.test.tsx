import React from 'react';
import { render, screen } from '@/test/utils/test-utils';
import { describe, it, expect } from 'vitest';
import { useForm } from 'react-hook-form';
import EquipmentNotesSection from '../form/EquipmentNotesSection';
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
      notes: '',
      ...defaultValues
    }
  });

  return <EquipmentNotesSection form={form} />;
};

describe('EquipmentNotesSection', () => {
  describe('Core Rendering', () => {
    it('renders notes field label', () => {
      render(<TestWrapper />);
      
      expect(screen.getByLabelText('Description/Notes')).toBeInTheDocument();
    });

    it('renders textarea with placeholder', () => {
      render(<TestWrapper />);
      
      const textarea = screen.getByPlaceholderText('Additional information about the equipment...');
      expect(textarea).toBeInTheDocument();
      expect(textarea.tagName).toBe('TEXTAREA');
    });

    it('applies minimum height class', () => {
      render(<TestWrapper />);
      
      const textarea = screen.getByPlaceholderText('Additional information about the equipment...');
      expect(textarea).toHaveClass('min-h-[100px]');
    });
  });

  describe('Form Field Values', () => {
    it('displays default empty value', () => {
      render(<TestWrapper />);
      
      const textarea = screen.getByPlaceholderText('Additional information about the equipment...') as HTMLTextAreaElement;
      expect(textarea.value).toBe('');
    });

    it('displays provided notes value', () => {
      render(<TestWrapper defaultValues={{ notes: 'Test notes content' }} />);
      
      const textarea = screen.getByPlaceholderText('Additional information about the equipment...') as HTMLTextAreaElement;
      expect(textarea.value).toBe('Test notes content');
    });

    it('handles long notes content', () => {
      const longNotes = 'A'.repeat(1000);
      render(<TestWrapper defaultValues={{ notes: longNotes }} />);
      
      const textarea = screen.getByPlaceholderText('Additional information about the equipment...') as HTMLTextAreaElement;
      expect(textarea.value.length).toBe(1000);
    });
  });
});


