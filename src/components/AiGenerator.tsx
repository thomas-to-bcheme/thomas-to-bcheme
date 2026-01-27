'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Send,
  User,
  Bot,
  Loader2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  FileText,
  Briefcase,
  Wrench,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { ChatError } from '@/types/api-errors';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';
import VoiceControls from '@/components/VoiceControls';
import {
  sendChatMessage,
  getErrorMessage,
  isRetryableError,
  isRateLimitError,
} from '@/lib/chat-api';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

interface AiGeneratorProps {
  /** When true, shows a compact collapsed view (mobile-friendly) */
  collapsed?: boolean;
  /** Callback when collapsed state should change */
  onToggleCollapse?: () => void;
}

const SUGGESTED_QUESTIONS = [
  'What are your strongest technical skills?',
  'Tell me about your AI/ML experience',
  'What projects demonstrate your capabilities?',
  'Are you available for interviews?',
];

const CAPABILITY_BADGES = [
  { icon: FileText, label: 'Resume Context', description: 'Full resume access' },
  {
    icon: Briefcase,
    label: 'Career History',
    description: 'Work experience details',
  },
  { icon: Wrench, label: 'Tech Stack', description: 'Technical expertise' },
];

export default function AiGenerator({
  collapsed = false,
  onToggleCollapse,
}: AiGeneratorProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingDuration, setLoadingDuration] = useState(0);
  const [chatError, setChatError] = useState<ChatError | null>(null);
  const [rateLimitCountdown, setRateLimitCountdown] = useState(0);
  const [ttsEnabled, setTtsEnabled] = useState(false);

  // Voice hooks
  const {
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    resetTranscript,
    isSupported: sttSupported,
    error: sttError,
  } = useSpeechRecognition();

  const {
    speakChunk,
    cancel: cancelSpeech,
    isSpeaking,
    isSupported: ttsSupported,
  } = useSpeechSynthesis();

  // Ref for the container to handle scrolling locally
  const chatContainerRef = useRef<HTMLDivElement>(null);
  // Store last prompt for retry functionality
  const lastPromptRef = useRef<string>('');
  // Track streaming content for TTS
  const lastContentLengthRef = useRef<number>(0);

  // Improved Scroll Logic: Only scroll the chat container, not the window
  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      const { scrollHeight, clientHeight } = chatContainerRef.current;
      chatContainerRef.current.scrollTop = scrollHeight - clientHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

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

  // Handle voice transcript → input sync
  useEffect(() => {
    if (transcript) {
      setInput(transcript);
    }
  }, [transcript]);

  // Auto-submit when user stops speaking (after 1.5s of silence with content)
  useEffect(() => {
    if (!isListening && transcript.trim()) {
      const timer = setTimeout(() => {
        handleSubmit(undefined, transcript.trim());
        resetTranscript();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isListening, transcript]);

  // Handle TTS for streaming responses
  useEffect(() => {
    if (!ttsEnabled || messages.length === 0) return;

    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role !== 'assistant') return;

    // Get new content since last check
    const newContent = lastMessage.content.slice(lastContentLengthRef.current);
    if (newContent) {
      speakChunk(newContent);
      lastContentLengthRef.current = lastMessage.content.length;
    }
  }, [messages, ttsEnabled, speakChunk]);

  // Reset TTS content tracking when starting new response
  useEffect(() => {
    if (isLoading) {
      lastContentLengthRef.current = 0;
      if (ttsEnabled) {
        cancelSpeech();
      }
    }
  }, [isLoading, ttsEnabled, cancelSpeech]);

  async function handleSubmit(e?: React.FormEvent, overridePrompt?: string) {
    e?.preventDefault();
    const promptText = overridePrompt || input;

    if (!promptText.trim() || isLoading) return;

    // Store for retry
    lastPromptRef.current = promptText;
    setChatError(null);

    // 1. Add User Message
    const newHistory: Message[] = [
      ...messages,
      { role: 'user', content: promptText },
    ];
    setMessages(newHistory);
    setInput('');
    setIsLoading(true);

    // 2. Send request with proper error handling
    const result = await sendChatMessage(newHistory);

    if (!result.success) {
      // Handle error - show user-friendly message
      const error = result.error;
      setChatError(error);

      // Set rate limit countdown if applicable
      if (isRateLimitError(error) && error.type === 'api' && error.retryAfter) {
        setRateLimitCountdown(error.retryAfter);
      }

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Error: ${getErrorMessage(error)}`,
        },
      ]);
      setIsLoading(false);
      return;
    }

    // 3. Prepare Assistant Message Placeholder
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

    // 4. Stream Response
    try {
      const reader = result.response.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });

        // Update last message with new chunk
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          const others = prev.slice(0, -1);
          return [...others, { ...last, content: last.content + chunk }];
        });
      }
    } catch (streamError) {
      console.error('Stream error:', streamError);
      const error: ChatError = {
        type: 'stream',
        message: streamError instanceof Error ? streamError.message : 'Stream interrupted',
      };
      setChatError(error);
      // Update the assistant message with error
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
  }

  // Retry handler
  function handleRetry() {
    if (lastPromptRef.current && !isLoading && chatError && isRetryableError(chatError)) {
      // Remove the error message before retrying
      setMessages((prev) => prev.slice(0, -1));
      handleSubmit(undefined, lastPromptRef.current);
    }
  }

  // Voice control handlers
  const handleToggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      resetTranscript();
      setInput('');
      startListening();
    }
  };

  const handleToggleTts = () => {
    if (ttsEnabled) {
      cancelSpeech();
    }
    setTtsEnabled(!ttsEnabled);
  };

  // --- COLLAPSED MOBILE VIEW ---
  if (collapsed) {
    return (
      <div className="p-4 text-sm">
        <button
          onClick={onToggleCollapse}
          className="w-full flex items-center justify-between p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-indigo-500 dark:hover:border-indigo-500 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 dark:bg-indigo-900/30 p-2 rounded-full">
              <Bot className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-zinc-900 dark:text-white text-sm">
                Resume RAG Agent
              </h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-xs">
                Ask about qualifications &amp; experience
              </p>
            </div>
          </div>
          <ChevronDown className="w-5 h-5 text-zinc-400" />
        </button>
      </div>
    );
  }

  return (
    // Height is set to min-h-full to ensure it fills the HeroSection container
    // We use relative positioning to contain the sticky footer
    <div
      ref={chatContainerRef}
      className="flex flex-col min-h-full relative text-sm"
    >
      {/* --- MOBILE COLLAPSE BUTTON (when expanded) --- */}
      {onToggleCollapse && (
        <button
          onClick={onToggleCollapse}
          className="lg:hidden flex items-center justify-center gap-2 p-2 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 border-b border-zinc-200 dark:border-zinc-800"
        >
          <ChevronUp className="w-4 h-4" />
          Collapse chat
        </button>
      )}

      {/* --- EMPTY STATE / STARTER BUTTONS --- */}
      {messages.length === 0 && (
        <div className="flex flex-col p-4 space-y-4">
          {/* Capability Badges */}
          <div className="flex flex-wrap gap-2">
            {CAPABILITY_BADGES.map((cap) => (
              <div
                key={cap.label}
                className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
              >
                <cap.icon className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                <div className="text-left">
                  <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
                    {cap.label}
                  </p>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                    {cap.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Tagline */}
          <p className="text-zinc-500 dark:text-zinc-400 text-xs">
            Ask me about Thomas&apos;s qualifications, experience, or technical
            expertise
          </p>

          {/* Suggested Questions Grid (2x2) */}
          <div className="grid grid-cols-2 gap-2">
            {SUGGESTED_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => handleSubmit(undefined, q)}
                className="text-xs border border-zinc-200 dark:border-zinc-700 hover:border-indigo-500 dark:hover:border-indigo-500 bg-white dark:bg-zinc-800 p-2.5 rounded-lg transition-colors text-left line-clamp-2"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* --- MESSAGE HISTORY --- */}
      <div className="flex-1 p-4 space-y-4 pb-20">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {/* Assistant Avatar */}
            {m.role === 'assistant' && (
              <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center shrink-0 mt-1">
                <Bot size={14} className="text-indigo-600 dark:text-indigo-400" />
              </div>
            )}

            {/* Message Bubble */}
            <div
              className={`
  max-w-[85%] rounded-2xl px-4 py-2.5 leading-relaxed shadow-sm overflow-hidden
  ${
    m.role === 'user'
      ? 'bg-blue-600 text-white rounded-br-none'
      : 'bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-bl-none'
  }
`}
            >
              {m.role === 'user' ? (
                <p>{m.content}</p>
              ) : (
                <div
                  className="prose dark:prose-invert prose-sm max-w-none
      prose-p:leading-relaxed prose-pre:bg-zinc-100 dark:prose-pre:bg-zinc-900
      prose-li:marker:text-zinc-400"
                >
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              )}
            </div>

            {/* User Avatar */}
            {m.role === 'user' && (
              <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center shrink-0 mt-1">
                <User size={14} className="text-white" />
              </div>
            )}
          </div>
        ))}

        {/* --- LOADING INDICATOR with timeout message --- */}
        {isLoading && (
          <div className="flex gap-3 justify-start animate-pulse motion-reduce:animate-none">
            <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center shrink-0">
              <Loader2
                size={14}
                className="animate-spin motion-reduce:animate-none text-indigo-600 dark:text-indigo-400"
                aria-hidden="true"
              />
            </div>
            <div className="bg-white dark:bg-zinc-800 px-4 py-2 rounded-2xl rounded-bl-none border border-zinc-100 dark:border-zinc-700">
              <span
                className="text-xs text-zinc-400"
                role="status"
                aria-live="polite"
              >
                Thinking...
                {loadingDuration >= 10 && ' (taking longer than usual)'}
              </span>
            </div>
          </div>
        )}

        {/* --- RETRY BUTTON after error --- */}
        {chatError && !isLoading && lastPromptRef.current && (
          <div className="flex justify-center">
            {isRateLimitError(chatError) && rateLimitCountdown > 0 ? (
              <div className="flex items-center gap-2 px-3 py-1.5 text-xs bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded-lg border border-amber-200 dark:border-amber-800">
                <Loader2 size={14} className="animate-spin" />
                Retry in {rateLimitCountdown}s
              </div>
            ) : isRetryableError(chatError) ? (
              <button
                onClick={handleRetry}
                className="flex items-center gap-2 px-3 py-1.5 text-xs bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg transition-colors border border-zinc-200 dark:border-zinc-700"
              >
                <RefreshCw size={14} />
                Try again
              </button>
            ) : null}
          </div>
        )}
      </div>

      {/* --- STICKY INPUT AREA --- */}
      <div className="sticky bottom-0 bg-zinc-50/95 dark:bg-zinc-900/95 backdrop-blur-sm p-3 border-t border-zinc-200 dark:border-zinc-800">
        <form onSubmit={(e) => handleSubmit(e)} className="flex gap-2">
          {/* Voice Controls */}
          <VoiceControls
            isListening={isListening}
            onToggleListening={handleToggleListening}
            sttSupported={sttSupported}
            sttError={sttError}
            ttsEnabled={ttsEnabled}
            onToggleTts={handleToggleTts}
            isSpeaking={isSpeaking}
            ttsSupported={ttsSupported}
            disabled={isLoading}
          />

          {/* Input Field */}
          <input
            className="flex-1 bg-white dark:bg-black border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white placeholder:text-zinc-400"
            value={isListening ? `${input}${interimTranscript}` : input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              isListening ? 'Listening...' : 'Ask a question...'
            }
            disabled={isLoading || isListening}
            aria-label="Chat message input"
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={isLoading || !input.trim() || isListening}
            aria-label={isLoading ? 'Sending message' : 'Send message'}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white p-2 rounded-lg transition-colors flex items-center justify-center"
          >
            {isLoading ? (
              <Loader2
                size={18}
                className="animate-spin motion-reduce:animate-none"
              />
            ) : (
              <Send size={18} />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
