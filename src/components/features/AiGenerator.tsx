'use client';

import { useState, useEffect } from 'react';
import {
  Send,
  User,
  Bot,
  Loader2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { isRetryableError, isRateLimitError } from '@/lib/chat-api';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';
import { useChat } from '@/hooks/useChat';
import VoiceControls from '@/components/voice/VoiceControls';
import { SUGGESTED_QUESTIONS, CAPABILITY_BADGES } from '@/constants/chat';
import { parseAssistantMessage } from '@/lib/followups';

interface AiGeneratorProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function AiGenerator({
  collapsed = false,
  onToggleCollapse,
}: AiGeneratorProps) {
  const {
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
  } = useChat();

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

  // Handle voice transcript -> input sync
  useEffect(() => {
    if (transcript) {
      setInput(transcript);
    }
  }, [transcript, setInput]);

  // Auto-submit when user stops speaking
  useEffect(() => {
    if (!isListening && transcript.trim()) {
      const timer = setTimeout(() => {
        handleSubmit(undefined, transcript.trim());
        resetTranscript();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isListening, transcript, handleSubmit, resetTranscript]);

  // Handle TTS for streaming responses
  useEffect(() => {
    if (!ttsEnabled || messages.length === 0) return;

    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role !== 'assistant') return;

    // Speak only the visible answer, never the hidden follow-up control line.
    const displayText = parseAssistantMessage(lastMessage.content).text;
    const newContent = displayText.slice(lastContentLengthRef.current);
    if (newContent) {
      speakChunk(newContent);
      lastContentLengthRef.current = displayText.length;
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

  // Contextual follow-up chips: shown under the latest completed answer only.
  const latestMessage = messages[messages.length - 1];
  const followUps =
    latestMessage && latestMessage.role === 'assistant' && !isLoading && !chatError
      ? parseAssistantMessage(latestMessage.content).followUps
      : [];

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
                  <p className="text-micro text-zinc-800 dark:text-zinc-200">
                    {cap.label}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
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
                className="text-xs leading-snug border border-zinc-200 dark:border-zinc-700 hover:border-indigo-500 dark:hover:border-indigo-500 bg-white dark:bg-zinc-800 p-2.5 rounded-lg transition-colors text-left"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* --- MESSAGE HISTORY --- */}
      <div className="flex-1 p-4 space-y-4 pb-20">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {m.role === 'assistant' && (
              <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center shrink-0 mt-1">
                <Bot size={14} className="text-indigo-600 dark:text-indigo-400" />
              </div>
            )}

            <div
              className={m.role === 'user' ? 'message-user' : 'message-assistant'}
            >
              {m.role === 'user' ? (
                <p>{m.content}</p>
              ) : (
                <div
                  className="prose dark:prose-invert prose-sm max-w-none
      prose-p:leading-relaxed prose-pre:bg-zinc-100 dark:prose-pre:bg-zinc-900
      prose-li:marker:text-zinc-400"
                >
                  <ReactMarkdown>{parseAssistantMessage(m.content).text}</ReactMarkdown>
                </div>
              )}
            </div>

            {m.role === 'user' && (
              <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center shrink-0 mt-1">
                <User size={14} className="text-white" />
              </div>
            )}
          </div>
        ))}

        {/* --- FOLLOW-UP SUGGESTIONS (under the latest answer) --- */}
        {followUps.length > 0 && (
          <div className="flex flex-wrap gap-2 pl-9">
            {followUps.map((question) => (
              <button
                key={question}
                onClick={() => handleSubmit(undefined, question)}
                className="text-xs border border-zinc-200 dark:border-zinc-700 hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 bg-white dark:bg-zinc-800 px-3 py-1.5 rounded-full transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-50 dark:focus-visible:ring-offset-zinc-900"
              >
                {question}
              </button>
            ))}
          </div>
        )}

        {/* --- LOADING INDICATOR --- */}
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
        {chatError && !isLoading && (
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

          <label htmlFor="chat-message-input" className="sr-only">
            Chat message
          </label>
          <input
            id="chat-message-input"
            className="flex-1 input-base"
            value={isListening ? `${input}${interimTranscript}` : input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              isListening ? 'Listening...' : 'Ask a question...'
            }
            disabled={isLoading || isListening}
            aria-label="Chat message input"
          />

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
