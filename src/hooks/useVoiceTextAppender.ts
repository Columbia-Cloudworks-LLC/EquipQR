import { useCallback, useRef } from 'react';
import { useSpeechToText } from '@/hooks/useSpeechToText';

export interface UseVoiceTextAppenderOptions {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  readOnly?: boolean;
  lang?: string;
  continuous?: boolean;
}

export interface UseVoiceTextAppenderReturn {
  isSupported: boolean;
  isListening: boolean;
  error: string | null;
  interimTranscript: string;
  toggleListening: () => void;
  canUseVoice: boolean;
}

/**
 * Append a final speech transcript to an existing text value with a single space separator.
 */
export function appendSpeechTranscript(currentValue: string, transcript: string): string {
  const trimmedTranscript = transcript.trim();
  if (!trimmedTranscript) {
    return currentValue;
  }

  const separator = currentValue.trim() ? ' ' : '';
  return currentValue + separator + trimmedTranscript;
}

/**
 * Hook that wires speech-to-text into a controlled text field, appending final transcripts
 * to the latest value via refs to avoid stale closures.
 */
export function useVoiceTextAppender(
  options: UseVoiceTextAppenderOptions
): UseVoiceTextAppenderReturn {
  const { value, onChange, disabled = false, readOnly = false, lang, continuous } = options;

  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  valueRef.current = value;
  onChangeRef.current = onChange;

  const handleSpeechResult = useCallback((transcript: string) => {
    const nextValue = appendSpeechTranscript(valueRef.current, transcript);
    onChangeRef.current(nextValue);
  }, []);

  const {
    isSupported,
    isListening,
    error,
    interimTranscript,
    toggleListening,
  } = useSpeechToText({
    onResult: handleSpeechResult,
    lang,
    continuous,
  });

  const canUseVoice = isSupported && !disabled && !readOnly;

  return {
    isSupported,
    isListening,
    error,
    interimTranscript,
    toggleListening,
    canUseVoice,
  };
}
