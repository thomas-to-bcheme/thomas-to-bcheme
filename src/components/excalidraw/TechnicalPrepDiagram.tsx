'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import type { AppState, BinaryFiles, ExcalidrawInitialDataState } from '@excalidraw/excalidraw/types';
import { isValidFractionalIndex } from '@/lib/fractionalIndex';
import {
  DEFAULT_BOARD_NAME,
  SAVE_PAYLOAD_WARN_BYTES,
  SAVE_PAYLOAD_HARD_LIMIT_BYTES,
  isValidBoardName,
  boardFilePath,
  boardPublicUrl,
  blankBoardScaffold,
} from '@/lib/excalidrawBoards';

const ExcalidrawWrapper = dynamic(() => import('./ExcalidrawWrapper'), { ssr: false });

function sanitizeExcalidrawIndices(elements: unknown[]): unknown[] {
  const seen = new Set<string>();
  return elements.map((el) => {
    const element = el as Record<string, unknown>;
    const idx = element.index;
    if (isValidFractionalIndex(idx) && !seen.has(idx)) {
      seen.add(idx);
      return element;
    }
    const { index: _removed, ...rest } = element;
    return rest;
  });
}

// Reconstructs a raw fetched/scaffolded board into the shape Excalidraw's
// initialData expects: collaborators/followedBy round-trip through JSON as
// plain objects (Map/Set → {}), but Excalidraw's prod bundle calls
// forEach()/has() on them directly and crashes if left as plain objects.
function toInitialData(data: any): ExcalidrawInitialDataState {
  const collaborators = new Map(Object.entries(data.appState?.collaborators ?? {}));
  const followedBy = new Set(Object.values(data.appState?.followedBy ?? {}));
  return {
    ...data,
    elements: sanitizeExcalidrawIndices(data.elements ?? []),
    appState: data.appState
      ? { ...data.appState, collaborators, followedBy }
      : undefined,
    scrollToContent: true,
  };
}

const SESSION_TOKEN_KEY = 'excalidraw_save_token';
// Default viewport frame per board — specific to that board's own content, so
// looked up by board name rather than a single global constant. Frames are
// resolved dynamically by name from the live loaded scene (see
// ExcalidrawWrapper) — never by cached id/coordinates — so this stays correct
// if the frame is later moved/resized.
const BOARD_DEFAULT_FRAME_NAMES: Partial<Record<string, string>> = {
  [DEFAULT_BOARD_NAME]: 'Drug Discovery - Deep Learning (8-12)',
};

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'too_large';

interface SavePayload {
  elements: readonly ExcalidrawElement[];
  appState: AppState;
  files: BinaryFiles;
}

interface TechnicalPrepDiagramProps {
  /** Render the "SWE Study Plan" heading block + section anchor. The dedicated
   *  /study-plan page supplies its own heading, so it passes false for a bare canvas. */
  showHeading?: boolean;
  /** Forwarded to ExcalidrawWrapper — lets the dedicated page use a taller canvas. */
  heightClassName?: string;
  /** Board to load on first render. Defaults to the original single-board name
   *  for backward compatibility with existing links/bookmarks. */
  initialBoard?: string;
}

async function verifyToken(token: string): Promise<boolean> {
  try {
    const res = await fetch('/api/excalidraw/verify', {
      method: 'POST',
      headers: { 'X-Save-Token': token },
    });
    return res.ok;
  } catch {
    return false;
  }
}

function getStoredToken(): string | null {
  return sessionStorage.getItem(SESSION_TOKEN_KEY);
}

export default function TechnicalPrepDiagram({ showHeading = true, heightClassName, initialBoard }: TechnicalPrepDiagramProps = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const [activeBoard, setActiveBoard] = useState(
    initialBoard && isValidBoardName(initialBoard) ? initialBoard : DEFAULT_BOARD_NAME
  );
  const [boards, setBoards] = useState<string[]>([activeBoard]);
  const [initialData, setInitialData] = useState<ExcalidrawInitialDataState | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [sizeWarningBytes, setSizeWarningBytes] = useState<number | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [showTokenPrompt, setShowTokenPrompt] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [tokenError, setTokenError] = useState(false);
  const tokenInputRef = useRef<HTMLInputElement>(null);
  // Board name whose data was just set optimistically in-memory (by
  // createBoard), rather than fetched — read once by the load effect below
  // to skip an immediate, doomed-to-404 re-fetch of the same board.
  const optimisticBoardRef = useRef<string | null>(null);

  // Auto-unlock edit mode if a valid token is already stored from a prior session
  useEffect(() => {
    const stored = getStoredToken();
    if (!stored) return;
    verifyToken(stored).then((valid) => {
      if (valid) setIsEditMode(true);
      else sessionStorage.removeItem(SESSION_TOKEN_KEY);
    });
  }, []);

  useEffect(() => {
    if (!showTokenPrompt) return;
    const id = requestAnimationFrame(() => tokenInputRef.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(id);
  }, [showTokenPrompt]);

  // Warn before the user navigates away with unsaved edits.
  useEffect(() => {
    if (!isEditMode || !isDirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isEditMode, isDirty]);

  // Fetch the known board list once. Non-critical — the switcher just falls
  // back to showing only the active board if this fails.
  useEffect(() => {
    fetch('/api/excalidraw/list')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((data: { boards: string[] }) => setBoards(data.boards))
      .catch(() => {});
  }, []);

  // Reloads scene data whenever the active board changes. AbortController
  // guards against a stale response from a previously-active board landing
  // after the user has already switched to a different one.
  //
  // Skipped when optimisticBoardRef matches: a just-created board's content
  // was already committed to GitHub and set in-memory by createBoard(), but
  // its static file won't exist in *this* running deployment until the next
  // redeploy — fetching boardPublicUrl() here would 404 and immediately
  // clobber the optimistic data with a load error.
  useEffect(() => {
    if (optimisticBoardRef.current === activeBoard) {
      optimisticBoardRef.current = null;
      return;
    }
    const controller = new AbortController();
    setInitialData(null);
    setLoadError(false);
    fetch(boardPublicUrl(activeBoard), { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => setInitialData(toInitialData(data)))
      .catch((err) => {
        if (err.name !== 'AbortError') setLoadError(true);
      });
    return () => controller.abort();
  }, [activeBoard]);

  const executeSave = async (payload: SavePayload, token: string) => {
    const filePath = boardFilePath(activeBoard);
    const serialized = JSON.stringify({ ...payload, filePath });
    // Byte-accurate — .length on a string counts UTF-16 code units, not bytes.
    const byteSize = new Blob([serialized]).size;

    if (byteSize > SAVE_PAYLOAD_HARD_LIMIT_BYTES) {
      setSaveStatus('too_large');
      return;
    }
    setSizeWarningBytes(byteSize > SAVE_PAYLOAD_WARN_BYTES ? byteSize : null);

    setSaveStatus('saving');
    try {
      const response = await fetch('/api/excalidraw/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Save-Token': token,
        },
        body: serialized,
      });
      if (response.status === 401) {
        sessionStorage.removeItem(SESSION_TOKEN_KEY);
        setIsEditMode(false);
        setSaveStatus('error');
        return;
      }
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setSaveStatus(data?.error === 'board_too_large' ? 'too_large' : 'error');
        return;
      }
      setSaveStatus('saved');
      setIsDirty(false);
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch {
      setSaveStatus('error');
    }
  };

  const handleSave = async (payload: SavePayload) => {
    const token = getStoredToken();
    if (!token) return; // Save button only visible in edit mode, so token always present
    await executeSave(payload, token);
  };

  const handleEditClick = () => {
    const stored = getStoredToken();
    if (stored) {
      setIsEditMode(true);
      return;
    }
    setShowTokenPrompt(true);
  };

  const handleTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = tokenInput.trim();
    if (!token) return;

    const valid = await verifyToken(token);
    if (valid) {
      sessionStorage.setItem(SESSION_TOKEN_KEY, token);
      setTokenInput('');
      setTokenError(false);
      setShowTokenPrompt(false);
      setIsEditMode(true);
    } else {
      setTokenError(true);
      setTokenInput('');
    }
  };

  const switchBoard = (name: string) => {
    if (name === activeBoard || !isValidBoardName(name)) return;
    if (isEditMode && isDirty) {
      const confirmed = window.confirm('Discard unsaved changes and switch boards?');
      if (!confirmed) return;
    }
    setIsDirty(false);
    setSaveStatus('idle');
    setSizeWarningBytes(null);
    setActiveBoard(name);
    // Only sync the URL when actually mounted on the dedicated page — this
    // component is also embeddable elsewhere (see showHeading), where a
    // /study-plan URL would be wrong.
    if (pathname === '/study-plan') {
      router.replace(name === DEFAULT_BOARD_NAME ? '/study-plan' : `/study-plan?board=${name}`, { scroll: false });
    }
  };

  const createBoard = async (name: string) => {
    if (!isValidBoardName(name)) return;
    const token = getStoredToken();
    if (!token) {
      handleEditClick();
      return;
    }
    const response = await fetch('/api/excalidraw/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Save-Token': token },
      body: JSON.stringify({ name }),
    });
    if (!response.ok) return;

    setBoards((prev) => (prev.includes(name) ? prev : [...prev, name]));
    setIsDirty(false);
    setSaveStatus('idle');
    setSizeWarningBytes(null);
    optimisticBoardRef.current = name;
    setInitialData(toInitialData(blankBoardScaffold()));
    setLoadError(false);
    setActiveBoard(name);
    if (pathname === '/study-plan') {
      router.replace(`/study-plan?board=${name}`, { scroll: false });
    }
  };

  // Placeholders (loading / error) mirror the live canvas height so there's no
  // layout jump when the scene mounts. Falls back to the bounded embed height.
  const canvasHeightClass = heightClassName ?? 'h-[420px] sm:h-[500px] lg:h-[600px]';

  return (
    <section id={showHeading ? 'study-plan' : undefined} className={showHeading ? 'scroll-mt-24 py-16' : ''}>
      {showHeading && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            SWE Study Plan
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Zero to Offer — interactive technical preparation roadmap.{' '}
            {isEditMode ? 'Edit mode active.' : 'View mode — edit unlocked with save secret.'}
          </p>
        </div>
      )}

      {loadError && (
        <div className={`flex flex-col items-center justify-center gap-3 ${canvasHeightClass} rounded-xl border border-red-200 dark:border-red-800 text-red-500 text-sm`}>
          <p>Failed to load board &ldquo;{activeBoard}&rdquo;. Make sure it exists in public/excalidraw/.</p>
          {boards.length > 1 && (
            <select
              value={activeBoard}
              onChange={(e) => switchBoard(e.target.value)}
              aria-label="Switch board"
              className="px-2 py-1.5 rounded-lg text-sm border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
            >
              {boards.map((board) => (
                <option key={board} value={board}>{board}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {!loadError && !initialData && (
        <div className={`flex items-center justify-center ${canvasHeightClass} rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-400 text-sm animate-pulse`}>
          Loading diagram…
        </div>
      )}

      {!loadError && initialData && (
        <div className="relative">
          {/* Lock / unlock button — subtle, top-right corner */}
          {!isEditMode && (
            <button
              onClick={handleEditClick}
              aria-label="Unlock edit mode"
              className="absolute top-3 right-3 z-10 p-1.5 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors duration-150"
            >
              <Lock size={14} />
            </button>
          )}

          {sizeWarningBytes !== null && (
            <div className="absolute top-3 left-3 right-12 z-10 px-3 py-1.5 rounded-md bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 text-xs font-medium">
              This board is {(sizeWarningBytes / (1024 * 1024)).toFixed(1)}MB, approaching the save size limit. Consider starting a new board for new topics.
            </div>
          )}

          <ExcalidrawWrapper
            key={activeBoard}
            initialData={initialData}
            onSave={handleSave}
            saveStatus={saveStatus}
            viewModeEnabled={!isEditMode}
            onDiagramChange={() => setIsDirty(true)}
            defaultFrameName={BOARD_DEFAULT_FRAME_NAMES[activeBoard]}
            heightClassName={heightClassName}
            boards={boards}
            activeBoard={activeBoard}
            isEditMode={isEditMode}
            onSwitchBoard={switchBoard}
            onCreateBoard={createBoard}
            onRequestUnlock={handleEditClick}
          />

          {showTokenPrompt && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl z-20">
              <form
                onSubmit={handleTokenSubmit}
                onKeyDown={(e) => {
                  e.stopPropagation();
                }}
                className="bg-white dark:bg-zinc-900 rounded-xl p-6 shadow-2xl border border-zinc-200 dark:border-zinc-700 flex flex-col gap-3 w-80"
              >
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Unlock Edit Mode</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Enter the{' '}
                  <code className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1 rounded">SAVE_SECRET</code>{' '}
                  to enable editing and saving. Stored in sessionStorage for this session only.
                </p>
                {tokenError && (
                  <p className="text-xs text-red-500 font-medium">Invalid secret — try again.</p>
                )}
                <input
                  type="password"
                  ref={tokenInputRef}
                  value={tokenInput}
                  onChange={(e) => { setTokenInput(e.target.value); setTokenError(false); }}
                  placeholder="••••••••••••••••"
                  className="text-sm px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
                  >
                    Unlock
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowTokenPrompt(false); setTokenInput(''); setTokenError(false); }}
                    className="flex-1 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 text-sm transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
