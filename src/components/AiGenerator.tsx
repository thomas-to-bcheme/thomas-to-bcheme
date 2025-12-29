'use client';

import { useState, useRef, useEffect } from 'react';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

export default function ManualChat() {
  // Store the full conversation history
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Auto-scroll to bottom ref
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Helper to scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // --- THE CORE LOGIC ---
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    // 1. Add USER message to UI immediately
    const userMessage: Message = { role: 'user', content: input };
    const newHistory = [...messages, userMessage];
    setMessages(newHistory);
    setInput(''); // Clear input box
    setIsLoading(true);

    try {
      // 2. Add a placeholder ASSISTANT message
      // We will update this message in real-time as chunks arrive
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      // 3. Start the request
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newHistory }),
      });

      if (!response.body) throw new Error('No response body');

      // 4. Set up the stream reader
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      // 5. Loop through the stream
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Decode the chunk (e.g., "Hello", " world")
        const chunk = decoder.decode(value, { stream: true });

        // Update the LAST message (the assistant's) with the new chunk
        setMessages((prevMessages) => {
          const lastMsg = prevMessages[prevMessages.length - 1];
          const otherMsgs = prevMessages.slice(0, -1);
          
          return [
            ...otherMsgs,
            { ...lastMsg, content: lastMsg.content + chunk }
          ];
        });
      }

    } catch (error) {
      console.error('Stream error:', error);
      setMessages((prev) => [
        ...prev, 
        { role: 'assistant', content: 'Error: Something went wrong.' }
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-[500px] border rounded-lg bg-zinc-50 dark:bg-zinc-900 overflow-hidden">
      
      {/* CHAT AREA */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m, index) => (
          <div
            key={index}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${
                m.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-zinc-800 border dark:border-zinc-700'
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* INPUT AREA */}
      <form onSubmit={handleSubmit} className="p-4 border-t bg-white dark:bg-black">
        <div className="flex gap-2">
          <input
            className="flex-1 border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading}
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}