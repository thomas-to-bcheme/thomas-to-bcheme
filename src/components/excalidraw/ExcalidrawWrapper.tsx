'use client';

import { Excalidraw, MainMenu } from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';
import { useState, useRef, useEffect } from 'react';
import type {
  ExcalidrawImperativeAPI,
  ExcalidrawInitialDataState,
  AppState,
  BinaryFiles,
} from '@excalidraw/excalidraw/types';
import type { ExcalidrawElement, NonDeletedExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import { useSystemTheme } from '@/hooks/useSystemTheme';
import { isValidBoardName } from '@/lib/excalidrawBoards';

interface SavePayload {
  elements: readonly ExcalidrawElement[];
  appState: AppState;
  files: BinaryFiles;
}

interface ExcalidrawWrapperProps {
  initialData: ExcalidrawInitialDataState;
  onSave: (payload: SavePayload) => Promise<void>;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error' | 'too_large';
  viewModeEnabled: boolean;
  onDiagramChange?: () => void;
  defaultFrameName?: string;
  /** Tailwind height classes for the canvas frame. Defaults to the bounded
   *  embed height; the dedicated /study-plan page passes a taller value. */
  heightClassName?: string;
  boards: string[];
  activeBoard: string;
  isEditMode: boolean;
  onSwitchBoard: (name: string) => void;
  onCreateBoard: (name: string) => void;
  onRequestUnlock: () => void;
}

// Determines whether a clicked element-link points at this app's own
// /study-plan?board=<name> route. element.link is arbitrary user-authored
// content (anyone with edit access can type anything into a link field), so
// origin is checked explicitly rather than trusting the pathname alone —
// otherwise a link to an external site sharing the same path could be
// mis-intercepted (open-redirect-shaped bug).
function resolveInAppBoardLink(link: string | null): string | null {
  if (!link) return null;
  let url: URL;
  try {
    url = new URL(link, window.location.href);
  } catch {
    return null;
  }
  if (url.origin !== window.location.origin || url.pathname !== '/study-plan') return null;
  const boardParam = url.searchParams.get('board');
  if (!boardParam || !isValidBoardName(boardParam)) return null;
  return boardParam;
}

const DEFAULT_HEIGHT_CLASS = 'h-[420px] sm:h-[500px] lg:h-[600px]';

// Returns true when `target` is a focusable, editable surface (text input, textarea,
// select, or any contentEditable element) — i.e. somewhere a Space keystroke should
// type a space rather than be intercepted for pan/scroll purposes. Checked generically
// by DOM semantics (tag name / isContentEditable), not by Excalidraw's private internal
// class names, so this keeps working across Excalidraw versions.
function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'INPUT' ||
    target.tagName === 'SELECT' ||
    target.isContentEditable
  );
}

// Returns true when `target` — or an ancestor between it and `boundary` (exclusive) —
// is a container that natively handles wheel-scrolling, i.e. one of Excalidraw's own
// internal panels (shape library list, extra-tools dropdown, command palette, canvas
// search results, etc.) rendered as ordinary scrollable DOM children of the wrapper.
// Checked generically via computed overflow + actual scrollability, never by
// hardcoding Excalidraw's private CSS class names, so this keeps working across
// versions and automatically covers any panel Excalidraw adds in the future.
function isNativeScrollTarget(target: EventTarget | null, boundary: HTMLElement): boolean {
  let node = target instanceof Element ? target : null;
  while (node && node !== boundary) {
    const style = getComputedStyle(node);
    const scrollsVertically =
      (style.overflowY === 'auto' || style.overflowY === 'scroll') &&
      node.scrollHeight > node.clientHeight;
    const scrollsHorizontally =
      (style.overflowX === 'auto' || style.overflowX === 'scroll') &&
      node.scrollWidth > node.clientWidth;
    if (scrollsVertically || scrollsHorizontally) return true;
    node = node.parentElement;
  }
  return false;
}

export default function ExcalidrawWrapper({
  initialData,
  onSave,
  saveStatus,
  viewModeEnabled,
  onDiagramChange,
  defaultFrameName,
  heightClassName = DEFAULT_HEIGHT_CLASS,
  boards,
  activeBoard,
  isEditMode,
  onSwitchBoard,
  onCreateBoard,
  onRequestUnlock,
}: ExcalidrawWrapperProps) {
  const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawImperativeAPI | null>(null);
  const [showNewBoardForm, setShowNewBoardForm] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const theme = useSystemTheme();

  // Capture-phase wheel listener — fires before Excalidraw's own canvas listener.
  // Blocks page scroll while the pointer is over the widget (Excalidraw handles
  // canvas pan/zoom internally via its own wheel handling) — but only when the wheel
  // target isn't inside one of Excalidraw's own internally-scrollable panels (library
  // list, dropdown menus, command palette, search results); those keep native
  // wheel/trackpad scrolling.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      if (isNativeScrollTarget(e.target, el)) return;
      e.preventDefault();
    };
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

  // Keyboard scroll guard: prevents the browser's default Space-key scroll while the
  // pointer is physically inside the Excalidraw container — but never when the actual
  // key event target is an editable element (e.g. Excalidraw's text-editing textarea,
  // or a library/search input), so typing a space while editing text isn't swallowed.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let pointerInside = false;

    const onPointerEnter = () => { pointerInside = true; };
    const onPointerLeave = () => { pointerInside = false; };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' && pointerInside && !isEditableTarget(e.target)) {
        e.preventDefault();
      }
    };

    el.addEventListener('pointerenter', onPointerEnter);
    el.addEventListener('pointerleave', onPointerLeave);
    window.addEventListener('keydown', onKeyDown, { capture: true });

    return () => {
      el.removeEventListener('pointerenter', onPointerEnter);
      el.removeEventListener('pointerleave', onPointerLeave);
      window.removeEventListener('keydown', onKeyDown, { capture: true });
    };
  }, []);

  // Once the scene has loaded, default the viewport to the named frame (if provided
  // and present) instead of leaving it at the fit-all view set by
  // initialData.scrollToContent. Looked up dynamically by name from the live scene
  // elements — never hardcoded by id/coordinates — so it stays correct if the frame is
  // later moved or resized. Depends only on [excalidrawAPI, defaultFrameName], both
  // stable after first mount, so this fires exactly once and won't reset the user's
  // pan/zoom on later re-renders (e.g. toggling edit mode).
  useEffect(() => {
    if (!excalidrawAPI || !defaultFrameName) return;
    const frame = excalidrawAPI
      .getSceneElements()
      .find((el) => el.type === 'frame' && el.name === defaultFrameName);
    if (frame) {
      excalidrawAPI.scrollToContent(frame, { fitToContent: true, animate: false });
    }
  }, [excalidrawAPI, defaultFrameName]);

  const handleSave = async () => {
    if (!excalidrawAPI) return;
    await onSave({
      elements: excalidrawAPI.getSceneElements(),
      appState: excalidrawAPI.getAppState(),
      files: excalidrawAPI.getFiles(),
    });
  };

  const handleLinkOpen = (element: NonDeletedExcalidrawElement, event: CustomEvent<{ nativeEvent: MouseEvent | React.PointerEvent<HTMLCanvasElement> }>) => {
    const boardName = resolveInAppBoardLink(element.link);
    if (!boardName) return;
    event.preventDefault();
    onSwitchBoard(boardName);
  };

  const handleNewBoardClick = () => {
    if (!isEditMode) {
      onRequestUnlock();
      return;
    }
    setShowNewBoardForm(true);
  };

  const handleNewBoardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newBoardName.trim();
    if (!name) return;
    onCreateBoard(name);
    setNewBoardName('');
    setShowNewBoardForm(false);
  };

  const saveLabel: Record<typeof saveStatus, string> = {
    idle: `Save "${activeBoard}" to GitHub`,
    saving: 'Saving…',
    saved: 'Saved — reload in ~1 min',
    error: 'Save failed — retry',
    too_large: 'Board too large — start a new board',
  };

  const saveClass: Record<typeof saveStatus, string> = {
    idle: 'bg-blue-600 hover:bg-blue-700 text-white',
    saving: 'bg-zinc-400 text-white cursor-not-allowed',
    saved: 'bg-green-600 text-white',
    error: 'bg-red-600 hover:bg-red-700 text-white',
    too_large: 'bg-red-600 text-white cursor-not-allowed',
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full ${heightClassName} rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800`}
    >
      <Excalidraw
        initialData={initialData}
        excalidrawAPI={(api) => setExcalidrawAPI(api)}
        viewModeEnabled={viewModeEnabled}
        onChange={viewModeEnabled ? undefined : () => { onDiagramChange?.(); }}
        onLinkOpen={handleLinkOpen}
        theme={theme}
      >
        <MainMenu>
          <MainMenu.Group title="Boards">
            {boards.map((board) => (
              <MainMenu.Item key={board} selected={board === activeBoard} onSelect={() => onSwitchBoard(board)}>
                {board}
              </MainMenu.Item>
            ))}
            <MainMenu.Item onSelect={handleNewBoardClick}>New board…</MainMenu.Item>
          </MainMenu.Group>
          <MainMenu.Separator />
          {/* Mirrors Excalidraw's own default menu content exactly (verified against
              the installed package's fallback menu), since rendering a custom
              MainMenu here replaces that automatic default entirely. */}
          <MainMenu.DefaultItems.LoadScene />
          <MainMenu.DefaultItems.SaveToActiveFile />
          <MainMenu.DefaultItems.Export />
          <MainMenu.DefaultItems.SaveAsImage />
          <MainMenu.DefaultItems.SearchMenu />
          <MainMenu.DefaultItems.Help />
          <MainMenu.DefaultItems.ClearCanvas />
          <MainMenu.Separator />
          <MainMenu.Group title="Excalidraw links">
            <MainMenu.DefaultItems.Socials />
          </MainMenu.Group>
          <MainMenu.Separator />
          <MainMenu.DefaultItems.ToggleTheme />
          <MainMenu.DefaultItems.ChangeCanvasBackground />
        </MainMenu>
      </Excalidraw>

      {/* Visually-hidden live region — announces save status to screen readers (WCAG 4.1.3). */}
      <div aria-live="polite" className="sr-only">{saveLabel[saveStatus]}</div>

      <div className="absolute bottom-4 right-4 z-10 flex items-center gap-2">
        {boards.length > 1 && (
          <select
            value={activeBoard}
            onChange={(e) => onSwitchBoard(e.target.value)}
            aria-label="Switch board"
            className="px-2 py-2 rounded-lg text-sm border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-md"
          >
            {boards.map((board) => (
              <option key={board} value={board}>{board}</option>
            ))}
          </select>
        )}

        {showNewBoardForm ? (
          <form onSubmit={handleNewBoardSubmit} className="flex items-center gap-1">
            <input
              type="text"
              autoFocus
              value={newBoardName}
              onChange={(e) => setNewBoardName(e.target.value)}
              placeholder="board_name"
              className="w-32 px-2 py-2 rounded-lg text-sm border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="px-3 py-2 rounded-lg text-sm font-semibold shadow-md bg-blue-600 hover:bg-blue-700 text-white"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => { setShowNewBoardForm(false); setNewBoardName(''); }}
              className="px-3 py-2 rounded-lg text-sm shadow-md border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 bg-white dark:bg-zinc-800"
            >
              Cancel
            </button>
          </form>
        ) : (
          <button
            onClick={handleNewBoardClick}
            className="px-3 py-2 rounded-lg text-sm font-semibold shadow-md border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700"
          >
            + New
          </button>
        )}

        {!viewModeEnabled && (
          <button
            onClick={handleSave}
            disabled={saveStatus === 'saving' || saveStatus === 'too_large'}
            className={`px-4 py-2 rounded-lg text-sm font-semibold shadow-md transition-all duration-200 ${saveClass[saveStatus]}`}
          >
            {saveLabel[saveStatus]}
          </button>
        )}
      </div>
    </div>
  );
}
