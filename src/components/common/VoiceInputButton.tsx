import React from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface VoiceInputButtonProps {
  isListening: boolean;
  onToggle: () => void;
  canUseVoice: boolean;
  className?: string;
  size?: 'sm' | 'icon';
}

const VoiceInputButton: React.FC<VoiceInputButtonProps> = ({
  isListening,
  onToggle,
  canUseVoice,
  className,
  size = 'sm',
}) => {
  // Keep the stop control visible during an active session even if the field becomes disabled.
  if (!canUseVoice && !isListening) {
    return null;
  }

  if (size === 'icon') {
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
  }

  return (
    <Button
      type="button"
      variant={isListening ? 'destructive' : 'outline'}
      size="sm"
      onClick={onToggle}
      aria-pressed={isListening}
      aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
      className={cn('h-7 px-2 gap-1', className)}
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
  );
};

export default VoiceInputButton;
