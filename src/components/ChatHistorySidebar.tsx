'use client';

import { useState } from 'react';
import {
  MessageSquare,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  History,
} from 'lucide-react';
import { Conversation } from '@/types/chat';

interface ChatHistorySidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  onClearAll: () => void;
}

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: 'short' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function ChatHistorySidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onClearAll,
}: ChatHistorySidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [confirmClear, setConfirmClear] = useState(false);

  const handleClearAll = () => {
    if (confirmClear) {
      onClearAll();
      setConfirmClear(false);
    } else {
      setConfirmClear(true);
      // Reset confirmation after 3 seconds
      setTimeout(() => setConfirmClear(false), 3000);
    }
  };

  // Collapsed view - just a toggle button
  if (isCollapsed) {
    return (
      <button
        onClick={() => setIsCollapsed(false)}
        className="absolute top-2 left-2 z-10 p-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
        aria-label="Show chat history"
        title="Show chat history"
      >
        <History size={16} className="text-zinc-500 dark:text-zinc-400" />
      </button>
    );
  }

  return (
    <div className="absolute top-0 left-0 bottom-0 z-20 w-56 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-2 border-b border-zinc-200 dark:border-zinc-800">
        <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
          <History size={14} />
          History
        </span>
        <button
          onClick={() => setIsCollapsed(true)}
          className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded"
          aria-label="Hide chat history"
        >
          <ChevronLeft size={14} className="text-zinc-500" />
        </button>
      </div>

      {/* New Chat Button */}
      <button
        onClick={onNewConversation}
        className="m-2 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
      >
        <Plus size={14} />
        New Chat
      </button>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <p className="text-xs text-zinc-400 dark:text-zinc-500 text-center p-4">
            No conversations yet
          </p>
        ) : (
          <ul className="p-1 space-y-0.5">
            {conversations.map((conv) => (
              <li key={conv.id}>
                <button
                  onClick={() => onSelectConversation(conv.id)}
                  className={`w-full text-left px-2 py-1.5 rounded-lg text-xs transition-colors group flex items-start gap-2 ${
                    conv.id === activeConversationId
                      ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                      : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  <MessageSquare
                    size={12}
                    className="shrink-0 mt-0.5 opacity-60"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium">{conv.title}</p>
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
                      {formatTimestamp(conv.updatedAt)}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteConversation(conv.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-500 transition-all"
                    aria-label="Delete conversation"
                  >
                    <Trash2 size={12} />
                  </button>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Clear All Footer */}
      {conversations.length > 0 && (
        <div className="p-2 border-t border-zinc-200 dark:border-zinc-800">
          <button
            onClick={handleClearAll}
            className={`w-full text-xs py-1.5 rounded-lg transition-colors ${
              confirmClear
                ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            {confirmClear ? 'Click again to confirm' : 'Clear all history'}
          </button>
        </div>
      )}
    </div>
  );
}
