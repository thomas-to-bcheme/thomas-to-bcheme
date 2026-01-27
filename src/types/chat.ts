/**
 * Type definitions for AI Chat Agent features:
 * - Chat history persistence
 * - Voice input/output
 */

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface Conversation {
  id: string;
  title: string;          // Auto-generated from first user message
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

export interface ChatStorage {
  version: number;
  conversations: Conversation[];
  activeConversationId: string | null;
}

// Constants
export const CHAT_STORAGE_KEY = 'thomas-to-chat-history';
export const CHAT_STORAGE_VERSION = 1;
export const MAX_CONVERSATIONS = 50;
export const TITLE_MAX_LENGTH = 50;

// Helper to generate unique IDs
export function generateConversationId(): string {
  return `conv_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// Helper to generate title from first user message
export function generateTitle(content: string): string {
  const cleaned = content.trim().replace(/\s+/g, ' ');
  if (cleaned.length <= TITLE_MAX_LENGTH) {
    return cleaned;
  }
  return cleaned.slice(0, TITLE_MAX_LENGTH - 3) + '...';
}
