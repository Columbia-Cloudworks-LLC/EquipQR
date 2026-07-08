import React from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface VoiceInputButtonProps {
  isListening: boolean;
  onToggle: () => void;
  canUseVoice: boolean;
  className?: string;
}

/**
 * Consistent microphone toggle rendered inside the bottom-left corner of the
 * text input it controls (pass positioning via className when the parent is
 * not using the default overlay placement).
 */
const VoiceInputButton: React.FC<VoiceInputButtonProps> = ({
  isListening,
  onToggle,
  canUseVoice,
  className,
}) => {
  // Keep the stop control visible during an active session even if the field becomes disabled.
  if (!canUseVoice && !isListening) {
    return null;
  }

  return (
    <Button
      type="button"
      variant={isListening ? 'destructive' : 'ghost'}
      size="sm"
      onClick={onToggle}
      aria-pressed={isListening}
      aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
      className={cn('h-8 w-8 p-0', className)}
      title={isListening ? 'Stop voice input' : 'Start voice input'}
    >
      {isListening ? (
        <MicOff className="h-4 w-4" />
      ) : (
        <Mic className="h-4 w-4" />
      )}
    </Button>
  );
};

export default VoiceInputButton;
