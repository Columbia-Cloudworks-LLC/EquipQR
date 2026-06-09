import React from 'react';
import { cn } from '@/lib/utils';

export interface VoiceInterimTranscriptProps {
  isListening: boolean;
  interimTranscript: string;
  className?: string;
}

const VoiceInterimTranscript: React.FC<VoiceInterimTranscriptProps> = ({
  isListening,
  interimTranscript,
  className,
}) => {
  if (!isListening || !interimTranscript) {
    return null;
  }

  return (
    <div
      className={cn(
        'absolute bottom-2 left-2 right-2 text-xs text-muted-foreground bg-muted/80 rounded px-2 py-1 pointer-events-none',
        className
      )}
    >
      {interimTranscript}...
    </div>
  );
};

export default VoiceInterimTranscript;
