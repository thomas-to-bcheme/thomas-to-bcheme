/**
 * Shared chat types
 *
 * Single source of truth for the Message type used by
 * both the AiGenerator component and the chat-api client.
 */

export type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};
