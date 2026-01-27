'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface UseSpeechSynthesisReturn {
  speak: (text: string) => void;
  speakChunk: (text: string) => void;
  cancel: () => void;
  isSpeaking: boolean;
  isSupported: boolean;
  error: string | null;
}

// Sentence boundary pattern for streaming TTS
const SENTENCE_BOUNDARY = /[.!?]\s+/;

export function useSpeechSynthesis(): UseSpeechSynthesisReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Buffer for incomplete sentences during streaming
  const bufferRef = useRef<string>('');
  // Queue for sentences waiting to be spoken
  const queueRef = useRef<string[]>([]);
  // Whether we're currently processing the queue
  const isProcessingRef = useRef(false);

  // Check for browser support
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (window.speechSynthesis) {
      setIsSupported(true);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const processQueue = useCallback(() => {
    if (isProcessingRef.current || queueRef.current.length === 0) return;

    const text = queueRef.current.shift();
    if (!text) return;

    isProcessingRef.current = true;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      isProcessingRef.current = false;
      if (queueRef.current.length > 0) {
        processQueue();
      } else {
        setIsSpeaking(false);
      }
    };

    utterance.onerror = (event) => {
      // 'canceled' is expected when we manually cancel
      if (event.error === 'canceled') {
        isProcessingRef.current = false;
        setIsSpeaking(false);
        return;
      }

      setError(`Speech error: ${event.error}`);
      isProcessingRef.current = false;
      setIsSpeaking(false);
    };

    window.speechSynthesis.speak(utterance);
  }, []);

  // Speak a complete text immediately
  const speak = useCallback(
    (text: string) => {
      if (!isSupported || !text.trim()) return;

      setError(null);

      // Cancel any ongoing speech and clear queue
      window.speechSynthesis.cancel();
      queueRef.current = [];
      bufferRef.current = '';
      isProcessingRef.current = false;

      // Add to queue and process
      queueRef.current.push(text);
      processQueue();
    },
    [isSupported, processQueue]
  );

  // Speak streaming text (accumulates until sentence boundary)
  const speakChunk = useCallback(
    (text: string) => {
      if (!isSupported || !text) return;

      setError(null);
      bufferRef.current += text;

      // Check for sentence boundaries
      const parts = bufferRef.current.split(SENTENCE_BOUNDARY);

      // Keep the last incomplete sentence in the buffer
      if (parts.length > 1) {
        const completeSentences = parts.slice(0, -1);
        bufferRef.current = parts[parts.length - 1];

        // Queue complete sentences
        for (const sentence of completeSentences) {
          const trimmed = sentence.trim();
          if (trimmed) {
            queueRef.current.push(trimmed);
          }
        }

        // Start processing if not already
        processQueue();
      }
    },
    [isSupported, processQueue]
  );

  // Cancel speech and clear queue
  const cancel = useCallback(() => {
    if (!isSupported) return;

    window.speechSynthesis.cancel();
    queueRef.current = [];
    bufferRef.current = '';
    isProcessingRef.current = false;
    setIsSpeaking(false);
    setError(null);
  }, [isSupported]);

  return {
    speak,
    speakChunk,
    cancel,
    isSpeaking,
    isSupported,
    error,
  };
}
