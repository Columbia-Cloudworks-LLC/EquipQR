import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Options for the useSpeechToText hook
 */
export interface UseSpeechToTextOptions {
  /**
   * Callback invoked when a final transcript is available.
   * The parent component should append this to the current field value.
   */
  onResult: (transcript: string) => void;
  /**
   * Callback invoked when an interim (in-progress) transcript is available.
   * Optional - can be used to show real-time feedback.
   */
  onInterimResult?: (transcript: string) => void;
  /**
   * Language for speech recognition (BCP 47 language tag).
   * Defaults to the browser's language.
   */
  lang?: string;
  /**
   * Whether to keep listening continuously until stopped.
   * Defaults to true.
   */
  continuous?: boolean;
}

/**
 * Return type for the useSpeechToText hook
 */
export interface UseSpeechToTextReturn {
  /** Whether the browser supports the Web Speech API */
  isSupported: boolean;
  /** Whether speech recognition is currently active */
  isListening: boolean;
  /** Current error message, if any */
  error: string | null;
  /** Interim transcript (in-progress speech, not yet final) */
  interimTranscript: string;
  /** Start listening for speech input */
  startListening: () => void;
  /** Stop listening for speech input */
  stopListening: () => void;
  /** Toggle listening state */
  toggleListening: () => void;
}

/**
 * Get a user-friendly error message for speech recognition errors
 */
function getErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case 'no-speech':
      return 'No speech was detected. Please try again.';
    case 'audio-capture':
      return 'No microphone was found or microphone is not working.';
    case 'not-allowed':
      return 'Microphone access was denied. Please allow microphone access in your browser settings.';
    case 'network':
      return 'A network error occurred. Please check your connection.';
    case 'aborted':
      return 'Speech recognition was aborted.';
    case 'service-not-allowed':
      return 'Speech recognition service is not allowed in this context.';
    case 'language-not-supported':
      return 'The selected language is not supported.';
    default:
      return `Speech recognition error: ${errorCode}`;
  }
}

/**
 * Check if the Web Speech API is supported in the current browser
 */
function getSpeechRecognitionConstructor(): typeof SpeechRecognition | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

/**
 * Hook for using the browser's native Web Speech API for speech-to-text.
 * 
 * This hook provides a simple interface to start/stop speech recognition
 * and receive transcripts via callbacks. It handles feature detection,
 * error handling, and cleanup automatically.
 * 
 * @example
 * ```tsx
 * const { isSupported, isListening, startListening, stopListening, error } = useSpeechToText({
 *   onResult: (transcript) => {
 *     setValue('notes', currentValue + ' ' + transcript);
 *   }
 * });
 * ```
 * 
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API
 */
export function useSpeechToText(options: UseSpeechToTextOptions): UseSpeechToTextReturn {
  const { onResult, onInterimResult, lang, continuous = true } = options;

  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [interimTranscript, setInterimTranscript] = useState('');
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isStoppingRef = useRef(false);

  // Check for browser support
  const SpeechRecognitionConstructor = getSpeechRecognitionConstructor();
  const isSupported = SpeechRecognitionConstructor !== null;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
    };
  }, []);

  const startListening = useCallback(() => {
    if (!isSupported || !SpeechRecognitionConstructor) {
      setError('Speech recognition is not supported in this browser.');
      return;
    }

    // Clear any previous error
    setError(null);
    setInterimTranscript('');
    isStoppingRef.current = false;

    // Create a new recognition instance
    const recognition = new SpeechRecognitionConstructor();
    recognitionRef.current = recognition;

    // Configure recognition
    recognition.continuous = continuous;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    
    if (lang) {
      recognition.lang = lang;
    }

    // Handle results
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let currentInterim = '';

      // Process all results
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;

        if (result.isFinal) {
          finalTranscript += transcript;
        } else {
          currentInterim += transcript;
        }
      }

      // Update interim transcript for visual feedback
      setInterimTranscript(currentInterim);
      if (onInterimResult && currentInterim) {
        onInterimResult(currentInterim);
      }

      // Send final transcript to parent
      if (finalTranscript) {
        onResult(finalTranscript);
        setInterimTranscript('');
      }
    };

    // Handle errors
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      // Ignore aborted errors when we're intentionally stopping
      if (event.error === 'aborted' && isStoppingRef.current) {
        return;
      }
      
      const errorMessage = getErrorMessage(event.error);
      setError(errorMessage);
      setIsListening(false);
      setInterimTranscript('');
    };

    // Handle end of recognition
    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript('');
      recognitionRef.current = null;
    };

    // Handle start of recognition
    recognition.onstart = () => {
      setIsListening(true);
    };

    // Start recognition
    try {
      recognition.start();
    } catch (err) {
      // Handle case where recognition is already started
      setError('Failed to start speech recognition. Please try again.');
      setIsListening(false);
    }
  }, [isSupported, SpeechRecognitionConstructor, continuous, lang, onResult, onInterimResult]);

  const stopListening = useCallback(() => {
    isStoppingRef.current = true;
    
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    
    setIsListening(false);
    setInterimTranscript('');
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  return {
    isSupported,
    isListening,
    error,
    interimTranscript,
    startListening,
    stopListening,
    toggleListening,
  };
}

export default useSpeechToText;
