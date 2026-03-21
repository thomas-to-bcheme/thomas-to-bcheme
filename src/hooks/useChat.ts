'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { ChatError } from '@/types/api-errors';
import type { Message } from '@/types/chat';
import {
  sendChatMessage,
  getErrorMessage,
  isRetryableError,
  isRateLimitError,
} from '@/lib/chat-api';

export interface UseChatReturn {
  messages: Message[];
  input: string;
  setInput: (value: string) => void;
  isLoading: boolean;
  loadingDuration: number;
  chatError: ChatError | null;
  rateLimitCountdown: number;
  chatContainerRef: React.RefObject<HTMLDivElement | null>;
  lastContentLengthRef: React.MutableRefObject<number>;
  handleSubmit: (e?: React.FormEvent, overridePrompt?: string) => Promise<void>;
  handleRetry: () => void;
}

export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingDuration, setLoadingDuration] = useState(0);
  const [chatError, setChatError] = useState<ChatError | null>(null);
  const [rateLimitCountdown, setRateLimitCountdown] = useState(0);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const lastPromptRef = useRef<string>('');
  const lastContentLengthRef = useRef<number>(0);

  // Scroll to bottom of chat container
  const scrollToBottom = useCallback(() => {
    if (chatContainerRef.current) {
      const { scrollHeight, clientHeight } = chatContainerRef.current;
      chatContainerRef.current.scrollTop = scrollHeight - clientHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  // Track loading duration for timeout message
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLoading) {
      setLoadingDuration(0);
      interval = setInterval(() => {
        setLoadingDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setLoadingDuration(0);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  // Rate limit countdown timer
  useEffect(() => {
    if (rateLimitCountdown <= 0) return;
    const timer = setInterval(() => {
      setRateLimitCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [rateLimitCountdown]);

  const handleSubmit = useCallback(async (e?: React.FormEvent, overridePrompt?: string) => {
    e?.preventDefault();
    const promptText = overridePrompt || input;

    if (!promptText.trim() || isLoading) return;

    // Store for retry
    lastPromptRef.current = promptText;
    setChatError(null);

    // Add User Message
    const newHistory: Message[] = [
      ...messages,
      { id: crypto.randomUUID(), role: 'user', content: promptText },
    ];
    setMessages(newHistory);
    setInput('');
    setIsLoading(true);

    // Send request
    const result = await sendChatMessage(newHistory);

    if (!result.success) {
      const error = result.error;
      setChatError(error);

      if (isRateLimitError(error) && error.type === 'api' && error.retryAfter) {
        setRateLimitCountdown(error.retryAfter);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `Error: ${getErrorMessage(error)}`,
        },
      ]);
      setIsLoading(false);
      return;
    }

    // Prepare Assistant Message Placeholder
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: '' }]);

    // Stream Response
    if (!result.response.body) {
      setChatError({ type: 'stream', message: 'No response body received' });
      setIsLoading(false);
      return;
    }

    try {
      const reader = result.response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });

        setMessages((prev) => {
          const last = prev[prev.length - 1];
          const others = prev.slice(0, -1);
          return [...others, { ...last, content: last.content + chunk }];
        });
      }
    } catch (streamError) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Stream error:', streamError);
      }
      const error: ChatError = {
        type: 'stream',
        message: streamError instanceof Error ? streamError.message : 'Stream interrupted',
      };
      setChatError(error);
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        const others = prev.slice(0, -1);
        return [
          ...others,
          {
            ...last,
            content: last.content + `\n\n[Error: ${getErrorMessage(error)}]`,
          },
        ];
      });
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages]);

  const handleRetry = useCallback(() => {
    if (lastPromptRef.current && !isLoading && chatError && isRetryableError(chatError)) {
      setMessages((prev) => prev.slice(0, -1));
      handleSubmit(undefined, lastPromptRef.current);
    }
  }, [isLoading, chatError, handleSubmit]);

  return {
    messages,
    input,
    setInput,
    isLoading,
    loadingDuration,
    chatError,
    rateLimitCountdown,
    chatContainerRef,
    lastContentLengthRef,
    handleSubmit,
    handleRetry,
  };
}
