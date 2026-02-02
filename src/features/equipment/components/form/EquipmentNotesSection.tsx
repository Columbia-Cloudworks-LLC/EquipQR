import React, { useCallback } from 'react';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { UseFormReturn } from 'react-hook-form';
import { Mic, MicOff } from 'lucide-react';
import { type EquipmentFormData } from '@/features/equipment/types/equipment';
import { useSpeechToText } from '@/hooks/useSpeechToText';

interface EquipmentNotesSectionProps {
  form: UseFormReturn<EquipmentFormData>;
}

const EquipmentNotesSection: React.FC<EquipmentNotesSectionProps> = ({ form }) => {
  // Handler to append transcript to the notes field
  const handleSpeechResult = useCallback((transcript: string) => {
    const currentValue = form.getValues('notes') || '';
    const separator = currentValue.trim() ? ' ' : '';
    form.setValue('notes', currentValue + separator + transcript, { 
      shouldValidate: true,
      shouldDirty: true 
    });
  }, [form]);

  const {
    isSupported,
    isListening,
    error: speechError,
    interimTranscript,
    toggleListening,
  } = useSpeechToText({
    onResult: handleSpeechResult,
  });

  return (
    <FormField
      control={form.control}
      name="notes"
      render={({ field }) => (
        <FormItem>
          <div className="flex items-center justify-between">
            <FormLabel>Description/Notes</FormLabel>
            {isSupported && (
              <Button
                type="button"
                variant={isListening ? "destructive" : "outline"}
                size="sm"
                onClick={toggleListening}
                aria-pressed={isListening}
                aria-label={isListening ? "Stop voice input" : "Start voice input"}
                className="h-7 px-2 gap-1"
              >
                {isListening ? (
                  <>
                    <MicOff className="h-3.5 w-3.5" />
                    <span className="text-xs">Stop</span>
                  </>
                ) : (
                  <>
                    <Mic className="h-3.5 w-3.5" />
                    <span className="text-xs">Voice</span>
                  </>
                )}
              </Button>
            )}
          </div>
          <FormControl>
            <div className="relative">
              <Textarea
                placeholder="Additional information about the equipment..."
                className="min-h-[100px]"
                {...field}
              />
              {isListening && interimTranscript && (
                <div className="absolute bottom-2 left-2 right-2 text-xs text-muted-foreground bg-muted/80 rounded px-2 py-1 pointer-events-none">
                  {interimTranscript}...
                </div>
              )}
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