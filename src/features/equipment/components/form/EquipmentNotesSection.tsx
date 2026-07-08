import React, { useCallback } from 'react';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { UseFormReturn } from 'react-hook-form';
import { type EquipmentFormData } from '@/features/equipment/types/equipment';
import { useVoiceTextAppender } from '@/hooks/useVoiceTextAppender';
import VoiceInputButton from '@/components/common/VoiceInputButton';
import VoiceInterimTranscript from '@/components/common/VoiceInterimTranscript';

interface EquipmentNotesSectionProps {
  form: UseFormReturn<EquipmentFormData>;
}

const EquipmentNotesSection: React.FC<EquipmentNotesSectionProps> = ({ form }) => {
  const notesValue = form.watch('notes') || '';

  const handleNotesChange = useCallback((nextValue: string) => {
    form.setValue('notes', nextValue, {
      shouldValidate: true,
      shouldDirty: true,
    });
  }, [form]);

  const {
    isListening,
    error: speechError,
    interimTranscript,
    toggleListening,
    canUseVoice,
  } = useVoiceTextAppender({
    value: notesValue,
    onChange: handleNotesChange,
  });

  return (
    <FormField
      control={form.control}
      name="notes"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Description/Notes</FormLabel>
          <FormControl>
            <div className="relative">
              <Textarea
                placeholder="Additional information about the equipment..."
                className="min-h-[100px] pb-12"
                {...field}
              />
              <VoiceInterimTranscript
                isListening={isListening}
                interimTranscript={interimTranscript}
                className="bottom-12 left-2 right-2"
              />
              <VoiceInputButton
                isListening={isListening}
                onToggle={toggleListening}
                canUseVoice={canUseVoice}
                className="absolute bottom-2 left-2"
              />
            </div>
          </FormControl>
          {speechError && (
            <p className="text-sm text-destructive">{speechError}</p>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default EquipmentNotesSection;
