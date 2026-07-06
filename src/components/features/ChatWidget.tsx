'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bot, Cpu, Maximize2, Minimize2, X } from 'lucide-react';

import AiGenerator from '@/components/features/AiGenerator';
import { useChatWidget } from '@/components/layout/ChatWidgetProvider';
import { GITHUB_PROFILE_URL } from '@/constants/site';

// Shared focus-visible ring, matching the convention used across nav/hero pills.
const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black';

const TEASER_DELAY_MS = 2000;
const TEASER_COPY = 'Ask me anything about my experience';

// Free-resize bounds. The panel stays clear of the viewport edges (it is anchored
// bottom-6/right-6, with a gap left below the sticky nav).
const MIN_PANEL_WIDTH = 320;
const MIN_PANEL_HEIGHT = 380;
const VIEWPORT_MARGIN_X = 48;
const VIEWPORT_MARGIN_Y = 96;

/**
 * ChatWidget — the Resume RAG agent as a floating bottom-right pop-up.
 *
 * - Launcher: a labeled "Ask my AI" pill with a live dot; animates away when open.
 * - Teaser: a one-time, dismissable bubble ~2s after load (retired once the chat
 *   is opened or the bubble is dismissed).
 * - Panel: mounts on first open and stays mounted so AiGenerator's useChat
 *   conversation survives close/reopen. Open/close state is shared (so the hero
 *   pill can drive it) via useChatWidget().
 */
export default function ChatWidget() {
  const { isOpen, open, close } = useChatWidget();
  const panelId = useId();

  // Panel mounts on first open, then stays mounted (preserves chat history).
  const [hasOpened, setHasOpened] = useState(false);

  // Free-resize: drag the top-left grip to any size (desktop only). `customSize`
  // (px) overrides the default sizing once set; null = default preset.
  const [customSize, setCustomSize] = useState<{ width: number; height: number } | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  // One-time teaser bubble.
  const [showTeaser, setShowTeaser] = useState(false);
  const [teaserDismissed, setTeaserDismissed] = useState(false);

  const launcherRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Opening the chat mounts the panel and retires the teaser for good.
  useEffect(() => {
    if (!isOpen) return;
    setHasOpened(true);
    setTeaserDismissed(true);
    setShowTeaser(false);
  }, [isOpen]);

  // Delayed, one-time teaser.
  useEffect(() => {
    if (teaserDismissed) return;
    const timer = window.setTimeout(() => setShowTeaser(true), TEASER_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [teaserDismissed]);

  // Track the desktop breakpoint — free-resize is desktop-only (mobile is a sheet).
  useEffect(() => {
    const query = window.matchMedia('(min-width: 640px)');
    const update = () => setIsDesktop(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  // Esc closes; focus the close button on open.
  useEffect(() => {
    if (!isOpen) return;
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        close();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, close]);

  const dismissTeaser = () => {
    setShowTeaser(false);
    setTeaserDismissed(true);
  };

  const handleClose = () => {
    close();
    // Return focus to the launcher for keyboard users.
    launcherRef.current?.focus();
  };

  const clampWidth = (width: number) =>
    Math.min(Math.max(width, MIN_PANEL_WIDTH), window.innerWidth - VIEWPORT_MARGIN_X);
  const clampHeight = (height: number) =>
    Math.min(Math.max(height, MIN_PANEL_HEIGHT), window.innerHeight - VIEWPORT_MARGIN_Y);

  // Header button: toggle between the default preset and a viewport-filling max.
  const toggleMaxSize = () => {
    setCustomSize((prev) =>
      prev
        ? null
        : { width: clampWidth(Number.MAX_SAFE_INTEGER), height: clampHeight(Number.MAX_SAFE_INTEGER) },
    );
  };

  // Drag the top-left grip to resize. The panel is anchored bottom-right, so the
  // top-left corner grows into the page (moving up/left increases the size).
  const handleResizeStart = (event: React.PointerEvent) => {
    event.preventDefault();
    const rect = panelRef.current?.getBoundingClientRect();
    if (!rect) return;

    const startX = event.clientX;
    const startY = event.clientY;
    const startWidth = rect.width;
    const startHeight = rect.height;

    setIsResizing(true);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'nwse-resize';

    const handleMove = (moveEvent: PointerEvent) => {
      setCustomSize({
        width: clampWidth(startWidth + (startX - moveEvent.clientX)),
        height: clampHeight(startHeight + (startY - moveEvent.clientY)),
      });
    };
    const handleUp = () => {
      setIsResizing(false);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  };

  return (
    <>
      {/* --- Launcher + teaser (bottom-right) --- */}
      <div className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-50 flex flex-col items-end gap-3 print:hidden">
        <AnimatePresence>
          {showTeaser && !isOpen && (
            <motion.div
              key="teaser"
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.25 }}
              className="relative max-w-[15rem] rounded-2xl rounded-br-sm border border-zinc-200 bg-white px-4 py-3 pr-8 text-sm text-zinc-700 shadow-xl dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
            >
              {TEASER_COPY}
              <button
                type="button"
                onClick={dismissTeaser}
                aria-label="Dismiss"
                className={`absolute right-1.5 top-1.5 rounded-full p-1 text-zinc-400 transition-colors hover:text-zinc-600 dark:hover:text-zinc-200 ${FOCUS_RING}`}
              >
                <X size={13} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          ref={launcherRef}
          type="button"
          onClick={open}
          tabIndex={isOpen ? -1 : undefined}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          aria-controls={panelId}
          aria-label="Open chat — ask my AI assistant"
          animate={{ scale: isOpen ? 0 : 1, opacity: isOpen ? 0 : 1 }}
          transition={{ duration: 0.2 }}
          style={{ pointerEvents: isOpen ? 'none' : 'auto' }}
          className={`group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-blue-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition-colors hover:from-blue-700 hover:to-blue-600 dark:shadow-blue-900/30 ${FOCUS_RING}`}
        >
          <Bot size={18} />
          <span>Ask my AI</span>
          <span className="relative flex h-2 w-2" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping motion-reduce:animate-none rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
        </motion.button>
      </div>

      {/* --- Panel (mounts on first open, kept alive to preserve chat state) --- */}
      {hasOpened && (
        <motion.div
          ref={panelRef}
          id={panelId}
          role="dialog"
          aria-modal={false}
          aria-label="Resume RAG chat assistant"
          aria-hidden={!isOpen}
          inert={isOpen ? undefined : true}
          initial={false}
          animate={{ opacity: isOpen ? 1 : 0, scale: isOpen ? 1 : 0.96, y: isOpen ? 0 : 12 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          style={{
            transformOrigin: 'bottom right',
            pointerEvents: isOpen ? 'auto' : 'none',
            // Custom drag size wins over the class presets (desktop only).
            ...(customSize && isDesktop ? { width: customSize.width, height: customSize.height } : {}),
          }}
          className={`fixed z-50 inset-x-2 bottom-2 top-16 sm:left-auto sm:right-6 sm:top-auto sm:bottom-6 sm:w-[min(26rem,calc(100vw-3rem))] sm:h-[min(600px,calc(100dvh-7rem))] ${
            isResizing ? '' : 'transition-[width,height] duration-200 ease-out motion-reduce:transition-none'
          } print:hidden`}
        >
          <div className="relative h-full">
            {/* Subtle static glow frame (no pulse — avoid a distracting corner). */}
            <div
              className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-blue-600 to-emerald-500 opacity-20 blur"
              aria-hidden="true"
            />

            {/* Top-left resize grip — drag to any size (desktop only). */}
            <div
              onPointerDown={handleResizeStart}
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize chat window"
              title="Drag to resize"
              className="group absolute left-0 top-0 z-10 hidden h-6 w-6 cursor-nwse-resize touch-none sm:block"
            >
              <span className="pointer-events-none absolute left-2 top-2 h-2.5 w-2.5 rounded-tl-sm border-l-2 border-t-2 border-zinc-400/60 transition-colors group-hover:border-blue-500 dark:border-zinc-500/60" />
            </div>

            <div className="relative flex h-full flex-col overflow-hidden card-base shadow-2xl">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
                <div className="flex gap-3">
                  <Cpu size={20} className="mt-0.5 shrink-0 text-blue-600 dark:text-blue-400" />
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      Resume RAG Agent
                    </span>
                    <a
                      href={GITHUB_PROFILE_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`mt-0.5 w-fit rounded-sm text-xs font-medium text-blue-600 hover:underline dark:text-blue-400 ${FOCUS_RING}`}
                    >
                      See source docs
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={toggleMaxSize}
                    aria-label={customSize ? 'Restore chat size' : 'Maximize chat window'}
                    aria-pressed={customSize !== null}
                    className={`hidden sm:inline-flex rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 ${FOCUS_RING}`}
                  >
                    {customSize ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                  </button>
                  <button
                    ref={closeButtonRef}
                    type="button"
                    onClick={handleClose}
                    aria-label="Close chat"
                    className={`rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 ${FOCUS_RING}`}
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Body — same scroll-area recipe as the old inline section. */}
              <div className="relative min-h-0 flex-1 overflow-auto custom-scrollbar bg-zinc-50 dark:bg-zinc-900">
                <AiGenerator />
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </>
  );
}
