'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, User, Bot, Loader2, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

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
  "Ask me about this project",
  "What is your tech stack?",
  "How does the RAG Agent work?"
];

export default function AiGenerator({ collapsed = false, onToggleCollapse }: AiGeneratorProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingDuration, setLoadingDuration] = useState(0);
  const [hasError, setHasError] = useState(false);

  // Ref for the container to handle scrolling locally
  const chatContainerRef = useRef<HTMLDivElement>(null);
  // Store last prompt for retry functionality
  const lastPromptRef = useRef<string>('');

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

  // Track loading duration for timeout message (U3)
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

  async function handleSubmit(e?: React.FormEvent, overridePrompt?: string) {
    e?.preventDefault();
    const promptText = overridePrompt || input;

    if (!promptText.trim() || isLoading) return;

    // Store for retry (U3)
    lastPromptRef.current = promptText;
    setHasError(false);

    // 1. Add User Message
    const newHistory: Message[] = [...messages, { role: 'user', content: promptText }];
    setMessages(newHistory);
    setInput('');
    setIsLoading(true);

    try {
      // 2. Start Request
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newHistory }),
      });

      if (!response.body) throw new Error('No response body');

      // 3. Prepare Assistant Message Placeholder
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      // 4. Stream Reader
      const reader = response.body.getReader();
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
    } catch (error) {
      console.error(error);
      setHasError(true);
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Error: Could not fetch response. Please check your connection and try again.' }]);
    } finally {
      setIsLoading(false);
    }
  }

  // Retry handler (U3)
  function handleRetry() {
    if (lastPromptRef.current && !isLoading) {
      // Remove the error message before retrying
      setMessages((prev) => prev.slice(0, -1));
      handleSubmit(undefined, lastPromptRef.current);
    }
  }

  // --- COLLAPSED MOBILE VIEW ---
  if (collapsed) {
    return (
      <div className="p-4 text-sm">
        <button
          onClick={onToggleCollapse}
          className="w-full flex items-center justify-between p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full">
              <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-zinc-900 dark:text-white text-sm">
                Chat with AI Agent
              </h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-xs">
                Ask about resume, tech stack, or architecture
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
    <div ref={chatContainerRef} className="flex flex-col min-h-full relative text-sm">

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
        <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-6 text-center opacity-90">
          <div className="bg-blue-100 dark:bg-blue-900/30 p-4 rounded-full">
            <Sparkles className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-zinc-900 dark:text-white mb-2">
              Ready to Chat
            </h3>
            <p className="text-zinc-500 dark:text-zinc-400 text-xs max-w-[200px] mx-auto">
              I can answer questions about Thomas's resume, tech stack, and architecture.
            </p>
          </div>
          <div className="grid gap-2 w-full max-w-[250px]">
            {SUGGESTED_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => handleSubmit(undefined, q)}
                className="text-xs border border-zinc-200 dark:border-zinc-700 hover:border-blue-500 dark:hover:border-blue-500 bg-white dark:bg-zinc-800 p-2 rounded-lg transition-colors text-left truncate"
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
          <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            
            {/* Assistant Avatar */}
            {m.role === 'assistant' && (
              <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center shrink-0 mt-1">
                <Bot size={14} className="text-indigo-600 dark:text-indigo-400" />
              </div>
            )}

            {/* Message Bubble */}
{/* Message Bubble */}
<div className={`
  max-w-[85%] rounded-2xl px-4 py-2.5 leading-relaxed shadow-sm overflow-hidden
  ${m.role === 'user' 
    ? 'bg-blue-600 text-white rounded-br-none' 
    : 'bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-bl-none'
  }
`}>
  {m.role === 'user' ? (
    <p>{m.content}</p>
  ) : (
    /* 🟢 FIX: Wrap ReactMarkdown in a div with the prose classes */
    <div className="prose dark:prose-invert prose-sm max-w-none 
      prose-p:leading-relaxed prose-pre:bg-zinc-100 dark:prose-pre:bg-zinc-900 
      prose-li:marker:text-zinc-400">
        <ReactMarkdown>
          {m.content}
        </ReactMarkdown>
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

        {/* --- LOADING INDICATOR with timeout message (U3) --- */}
        {isLoading && (
          <div className="flex gap-3 justify-start animate-pulse motion-reduce:animate-none">
            <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center shrink-0">
               <Loader2 size={14} className="animate-spin motion-reduce:animate-none text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
            </div>
            <div className="bg-white dark:bg-zinc-800 px-4 py-2 rounded-2xl rounded-bl-none border border-zinc-100 dark:border-zinc-700">
              <span className="text-xs text-zinc-400" role="status" aria-live="polite">
                Thinking...{loadingDuration >= 10 && ' (taking longer than usual)'}
              </span>
            </div>
          </div>
        )}

        {/* --- RETRY BUTTON after error (U3) --- */}
        {hasError && !isLoading && lastPromptRef.current && (
          <div className="flex justify-center">
            <button
              onClick={handleRetry}
              className="flex items-center gap-2 px-3 py-1.5 text-xs bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg transition-colors border border-zinc-200 dark:border-zinc-700"
            >
              <RefreshCw size={14} />
              Try again
            </button>
          </div>
        )}
      </div>

      {/* --- STICKY INPUT AREA --- */}
      {/* We use sticky positioning because the HeroSection wraps this component 
        in 'overflow-auto'. This forces the input to stay at the bottom of the visible area.
      */}
      <div className="sticky bottom-0 bg-zinc-50/95 dark:bg-zinc-900/95 backdrop-blur-sm p-3 border-t border-zinc-200 dark:border-zinc-800">
        <form onSubmit={(e) => handleSubmit(e)} className="flex gap-2">
          <input
            className="flex-1 bg-white dark:bg-black border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white placeholder:text-zinc-400"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question..."
            disabled={isLoading}
            aria-label="Chat message input"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            aria-label={isLoading ? "Sending message" : "Send message"}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white p-2 rounded-lg transition-colors flex items-center justify-center"
          >
            {isLoading ? <Loader2 size={18} className="animate-spin motion-reduce:animate-none" /> : <Send size={18} />}
          </button>
        </form>
      </div>

    </div>
  );
}