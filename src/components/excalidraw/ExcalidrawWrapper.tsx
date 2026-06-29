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
  // isActive tracks whether the user has clicked to engage the canvas (view mode only).
  // In edit mode the canvas is always considered active.
  const [isActive, setIsActive] = useState(false);
  const isActiveRef = useRef(false);
  const viewModeRef = useRef(viewModeEnabled);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    viewModeRef.current = viewModeEnabled;
  }, [viewModeEnabled]);

  const activateCanvas = () => {
    isActiveRef.current = true;
    setIsActive(true);
  };

  const deactivateCanvas = () => {
    isActiveRef.current = false;
    setIsActive(false);
  };

  // Non-passive wheel listener — prevents page scroll when the canvas is engaged or
  // in edit mode. Gated by refs so the listener is registered once and never stale.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      if (isActiveRef.current || !viewModeRef.current) e.preventDefault();
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, []);

  // Click outside the canvas (view mode only) → re-arm page scroll.
  useEffect(() => {
    const handleDocClick = (e: MouseEvent) => {
      if (viewModeRef.current && !containerRef.current?.contains(e.target as Node)) {
        deactivateCanvas();
      }
    };
    document.addEventListener('click', handleDocClick);
    return () => document.removeEventListener('click', handleDocClick);
  }, []);

  // Prevent Excalidraw's <a href="#"> toolbar triggers from scrolling the page.
  // A native capture-phase listener fires before Excalidraw's own handlers and
  // works correctly on SVG child elements that React's onClickCapture misses.
  // The hashchange handler is a safety net for any anchor navigation that slips through.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let savedScrollY: number | null = null;

    const onAnchorCapture = (e: MouseEvent) => {
      const anchor = (e.target as Element).closest?.('a[href^="#"]');
      if (anchor) e.preventDefault();
    };

    const onPointerDown = () => { savedScrollY = window.scrollY; };

    const onHashChange = () => {
      if (savedScrollY !== null) {
        window.scrollTo({ top: savedScrollY, behavior: 'instant' });
        history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    };

    el.addEventListener('click', onAnchorCapture, { capture: true });
    el.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('hashchange', onHashChange);

    return () => {
      el.removeEventListener('click', onAnchorCapture, { capture: true });
      el.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('hashchange', onHashChange);
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
      onKeyDown={(e) => {
        if (e.code === 'Space') {
          const target = e.target as HTMLElement;
          const isTextInput =
            target.tagName === 'TEXTAREA' ||
            target.tagName === 'INPUT' ||
            target.isContentEditable;
          if (!isTextInput) e.preventDefault();
        }
      }}
    >
      <Excalidraw
        initialData={initialData}
        excalidrawAPI={(api) => setExcalidrawAPI(api)}
        viewModeEnabled={viewModeEnabled}
        onChange={viewModeEnabled ? undefined : () => { onDiagramChange?.(); }}
      />

      {/* Click-to-activate overlay (view mode only). Matches the Google Maps / Figma
          embed pattern: plain scroll passes through to the page until the user
          intentionally engages the canvas with a click. */}
      {!isActive && viewModeEnabled && (
        <button
          type="button"
          className="absolute inset-0 z-20 flex items-center justify-center w-full group bg-transparent border-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset"
          onClick={activateCanvas}
          aria-label="Click to interact with the diagram"
        >
          <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none select-none">
            Click to interact
          </span>
        </button>
      )}

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
