'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ChatMessage,
  Conversation,
  ChatStorage,
  CHAT_STORAGE_KEY,
  CHAT_STORAGE_VERSION,
  MAX_CONVERSATIONS,
  generateConversationId,
  generateTitle,
} from '@/types/chat';

function getInitialStorage(): ChatStorage {
  return {
    version: CHAT_STORAGE_VERSION,
    conversations: [],
    activeConversationId: null,
  };
}

function loadFromStorage(): ChatStorage {
  if (typeof window === 'undefined') {
    return getInitialStorage();
  }

  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) {
      return getInitialStorage();
    }

    const parsed = JSON.parse(raw) as ChatStorage;

    // Version migration: if version mismatch, return fresh storage
    if (parsed.version !== CHAT_STORAGE_VERSION) {
      return getInitialStorage();
    }

    return parsed;
  } catch {
    return getInitialStorage();
  }
}

function saveToStorage(storage: ChatStorage): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(storage));
  } catch (error) {
    // localStorage quota exceeded or disabled
    console.warn('Failed to save chat history:', error);
  }
}

export interface UseChatHistoryReturn {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  activeConversationId: string | null;
  createConversation: () => Conversation;
  setActiveConversation: (id: string | null) => void;
  updateActiveMessages: (messages: ChatMessage[]) => void;
  deleteConversation: (id: string) => void;
  clearAllConversations: () => void;
  isLoaded: boolean;
}

export function useChatHistory(): UseChatHistoryReturn {
  const [storage, setStorage] = useState<ChatStorage>(getInitialStorage);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const loaded = loadFromStorage();
    setStorage(loaded);
    setIsLoaded(true);
  }, []);

  // Persist to localStorage on changes
  useEffect(() => {
    if (isLoaded) {
      saveToStorage(storage);
    }
  }, [storage, isLoaded]);

  const createConversation = useCallback((): Conversation => {
    const newConversation: Conversation = {
      id: generateConversationId(),
      title: 'New Conversation',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setStorage((prev) => {
      // Limit number of conversations
      let conversations = [newConversation, ...prev.conversations];
      if (conversations.length > MAX_CONVERSATIONS) {
        conversations = conversations.slice(0, MAX_CONVERSATIONS);
      }

      return {
        ...prev,
        conversations,
        activeConversationId: newConversation.id,
      };
    });

    return newConversation;
  }, []);

  const setActiveConversation = useCallback((id: string | null) => {
    setStorage((prev) => ({
      ...prev,
      activeConversationId: id,
    }));
  }, []);

  const updateActiveMessages = useCallback((messages: ChatMessage[]) => {
    setStorage((prev) => {
      if (!prev.activeConversationId) return prev;

      const conversations = prev.conversations.map((conv) => {
        if (conv.id !== prev.activeConversationId) return conv;

        // Auto-generate title from first user message if title is default
        let title = conv.title;
        if (title === 'New Conversation' && messages.length > 0) {
          const firstUserMessage = messages.find((m) => m.role === 'user');
          if (firstUserMessage) {
            title = generateTitle(firstUserMessage.content);
          }
        }

        return {
          ...conv,
          title,
          messages,
          updatedAt: Date.now(),
        };
      });

      return {
        ...prev,
        conversations,
      };
    });
  }, []);

  const deleteConversation = useCallback((id: string) => {
    setStorage((prev) => {
      const conversations = prev.conversations.filter((c) => c.id !== id);
      const activeConversationId =
        prev.activeConversationId === id
          ? conversations[0]?.id ?? null
          : prev.activeConversationId;

      return {
        ...prev,
        conversations,
        activeConversationId,
      };
    });
  }, []);

  const clearAllConversations = useCallback(() => {
    setStorage(getInitialStorage());
  }, []);

  const activeConversation =
    storage.conversations.find((c) => c.id === storage.activeConversationId) ??
    null;

  return {
    conversations: storage.conversations,
    activeConversation,
    activeConversationId: storage.activeConversationId,
    createConversation,
    setActiveConversation,
    updateActiveMessages,
    deleteConversation,
    clearAllConversations,
    isLoaded,
  };
}
