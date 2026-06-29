'use client';

import { Excalidraw } from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';
import { useState, useRef, useEffect } from 'react';
import type {
  ExcalidrawImperativeAPI,
  ExcalidrawInitialDataState,
  AppState,
  BinaryFiles,
} from '@excalidraw/excalidraw/types';
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';

interface SavePayload {
  elements: readonly ExcalidrawElement[];
  appState: AppState;
  files: BinaryFiles;
}

interface ExcalidrawWrapperProps {
  initialData: ExcalidrawInitialDataState;
  onSave: (payload: SavePayload) => Promise<void>;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  viewModeEnabled: boolean;
  onDiagramChange?: () => void;
}

export default function ExcalidrawWrapper({ initialData, onSave, saveStatus, viewModeEnabled, onDiagramChange }: ExcalidrawWrapperProps) {
  const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawImperativeAPI | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Capture-phase wheel listener — fires before Excalidraw's own canvas listener.
  // preventDefault prevents page scroll in both modes; Excalidraw handles zoom/pan natively.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => { e.preventDefault(); };
    el.addEventListener('wheel', handler, { passive: false, capture: true });
    return () => el.removeEventListener('wheel', handler, { capture: true });
  }, []);

  // Two-layer scroll defence:
  // 1. Anchor capture: prevents <a href="#"> clicks from triggering hash navigation.
  // 2. Scroll guard: saves scroll position on any pointerdown inside the container,
  //    then restores it if a scroll fires within 200ms. This catches focus-triggered
  //    scrolls from Excalidraw portals/menus that the hashchange listener would miss.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onAnchorCapture = (e: MouseEvent) => {
      const anchor = (e.target as Element).closest?.('a[href^="#"]');
      if (anchor) e.preventDefault();
    };

    let guardScrollY: number | null = null;
    let guardTimer: ReturnType<typeof setTimeout> | null = null;

    const disarmGuard = () => {
      guardScrollY = null;
      if (guardTimer) clearTimeout(guardTimer);
    };

    // Only arm for toolbar/menu clicks — skip raw canvas clicks since menus never open from there.
    // This prevents the guard from cancelling legitimate scrolls after canvas drawing interactions.
    const armGuard = (e: PointerEvent) => {
      if ((e.target as Element).tagName === 'CANVAS') return;
      if (guardTimer) clearTimeout(guardTimer);
      guardScrollY = window.scrollY;
      // Disarm after 200ms — keeps guard armed through the full pointerdown → click
      // sequence, including portal open and focus-triggered scroll.
      guardTimer = setTimeout(disarmGuard, 200);
    };

    const onScrollGuard = () => {
      if (guardScrollY !== null) {
        const y = guardScrollY;
        disarmGuard();
        window.scrollTo({ top: y, behavior: 'instant' });
      }
    };

    el.addEventListener('click', onAnchorCapture, { capture: true });
    el.addEventListener('pointerdown', armGuard);
    window.addEventListener('scroll', onScrollGuard, { capture: true });

    return () => {
      el.removeEventListener('click', onAnchorCapture, { capture: true });
      el.removeEventListener('pointerdown', armGuard);
      window.removeEventListener('scroll', onScrollGuard, { capture: true });
      if (guardTimer) clearTimeout(guardTimer);
    };
  }, []);

  const handleSave = async () => {
    if (!excalidrawAPI) return;
    await onSave({
      elements: excalidrawAPI.getSceneElements(),
      appState: excalidrawAPI.getAppState(),
      files: excalidrawAPI.getFiles(),
    });
  };

  const saveLabel: Record<typeof saveStatus, string> = {
    idle: 'Save to GitHub',
    saving: 'Saving…',
    saved: 'Saved',
    error: 'Save failed — retry',
  };

  const saveClass: Record<typeof saveStatus, string> = {
    idle: 'bg-blue-600 hover:bg-blue-700 text-white',
    saving: 'bg-zinc-400 text-white cursor-not-allowed',
    saved: 'bg-green-600 text-white',
    error: 'bg-red-600 hover:bg-red-700 text-white',
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[420px] sm:h-[500px] lg:h-[600px] rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800"
    >
      <Excalidraw
        initialData={initialData}
        excalidrawAPI={(api) => setExcalidrawAPI(api)}
        viewModeEnabled={viewModeEnabled}
        onChange={viewModeEnabled ? undefined : () => { onDiagramChange?.(); }}
      />

      {/* Visually-hidden live region — announces save status to screen readers (WCAG 4.1.3). */}
      <div aria-live="polite" className="sr-only">{saveLabel[saveStatus]}</div>

      {!viewModeEnabled && (
        <button
          onClick={handleSave}
          disabled={saveStatus === 'saving'}
          className={`absolute bottom-4 right-4 z-10 px-4 py-2 rounded-lg text-sm font-semibold shadow-md transition-all duration-200 ${saveClass[saveStatus]}`}
        >
          {saveLabel[saveStatus]}
        </button>
      )}
    </div>
  );
}
