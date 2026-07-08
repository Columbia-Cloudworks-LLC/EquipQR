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
  /** Start listening for speech input (requests microphone consent first) */
  startListening: () => Promise<void>;
  /** Stop listening for speech input */
  stopListening: () => void;
  /** Toggle listening state */
  toggleListening: () => void;
}

const MIC_DENIED_MESSAGE =
  'Microphone access was denied. Click the microphone button to try again, or allow microphone access in your browser settings.';

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
      return MIC_DENIED_MESSAGE;
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
 * Map a getUserMedia rejection to a user-friendly message.
 */
function getPermissionErrorMessage(err: unknown): string {
  const name = err instanceof DOMException ? err.name : '';
  switch (name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
    case 'SecurityError':
      return MIC_DENIED_MESSAGE;
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return 'No microphone was found or microphone is not working.';
    case 'NotReadableError':
    case 'TrackStartError':
      return 'The microphone is already in use by another application.';
    default:
      return 'Could not access the microphone. Please check your browser settings and try again.';
  }
}

/**
 * Explicitly request microphone permission so the browser shows its consent
 * prompt before speech recognition starts. The temporary stream is released
 * immediately; only the permission grant is needed. Returns null on success
 * or a user-facing error message on failure. Re-invoked on every click so a
 * previously denied user can restart the consent flow.
 */
async function requestMicrophonePermission(): Promise<string | null> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    // Older browsers without mediaDevices: let SpeechRecognition handle
    // permissions itself.
    return null;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    return null;
  } catch (err) {
    return getPermissionErrorMessage(err);
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
  const isStartingRef = useRef(false);
  const isMountedRef = useRef(true);

  // Check for browser support
  const SpeechRecognitionConstructor = getSpeechRecognitionConstructor();
  const isSupported = SpeechRecognitionConstructor !== null;

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
    };
  }, []);

  const startListening = useCallback(async () => {
    if (!isSupported || !SpeechRecognitionConstructor) {
      setError('Speech recognition is not supported in this browser.');
      return;
    }

    // Ignore re-entrant clicks while the permission prompt is open
    if (isStartingRef.current || recognitionRef.current) {
      return;
    }
    isStartingRef.current = true;

    // Clear any previous error
    setError(null);
    setInterimTranscript('');
    isStoppingRef.current = false;

    // Request microphone consent from the browser on every attempt so a
    // denied user can restart the consent process by clicking again.
    const permissionError = await requestMicrophonePermission();
    isStartingRef.current = false;
    if (!isMountedRef.current) {
      return;
    }
    if (permissionError) {
      setError(permissionError);
      setIsListening(false);
      return;
    }
    if (isStoppingRef.current) {
      // User toggled off while the permission prompt was open.
      return;
    }

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
    } catch {
      // Clear the ref so the re-entrancy guard does not block future
      // start attempts after a synchronous start() failure.
      recognitionRef.current = null;
      try {
        recognition.abort();
      } catch {
        // Defensive: abort on a never-started instance may throw in some engines.
      }
      setError('Speech recognition is already running or failed to start. Please try again.');
      setIsListening(false);
      setInterimTranscript('');
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
      void startListening();
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

