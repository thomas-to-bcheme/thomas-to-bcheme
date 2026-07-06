'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

interface ChatWidgetContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const ChatWidgetContext = createContext<ChatWidgetContextValue | null>(null);

/**
 * ChatWidgetProvider — shares the floating chat's open/close state so both the
 * bottom-right launcher (ChatWidget) and the hero's "Ask my AI" pill drive the
 * same panel. Mirrors the MotionProvider placement in components/layout.
 */
export function ChatWidgetProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  const value = useMemo<ChatWidgetContextValue>(
    () => ({ isOpen, open, close, toggle }),
    [isOpen, open, close, toggle],
  );

  return (
    <ChatWidgetContext.Provider value={value}>
      {children}
    </ChatWidgetContext.Provider>
  );
}

/**
 * useChatWidget — access the shared chat open/close controls. Fails fast if used
 * outside <ChatWidgetProvider> (CLAUDE.md §7.5).
 */
export function useChatWidget(): ChatWidgetContextValue {
  const context = useContext(ChatWidgetContext);
  if (context === null) {
    throw new Error('useChatWidget must be used within a <ChatWidgetProvider>');
  }
  return context;
}
