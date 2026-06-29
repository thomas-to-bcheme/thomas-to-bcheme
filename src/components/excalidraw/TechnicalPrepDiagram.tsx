'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, useRef } from 'react';
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import type { AppState, BinaryFiles, ExcalidrawInitialDataState } from '@excalidraw/excalidraw/types';

const ExcalidrawWrapper = dynamic(() => import('./ExcalidrawWrapper'), { ssr: false });

const FILE_PATH = 'public/excalidraw/technical_prep.excalidraw';
const PUBLIC_URL = '/excalidraw/technical_prep.excalidraw';
const SESSION_TOKEN_KEY = 'excalidraw_save_token';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface SavePayload {
  elements: readonly ExcalidrawElement[];
  appState: AppState;
  files: BinaryFiles;
}

export default function TechnicalPrepDiagram() {
  const [initialData, setInitialData] = useState<ExcalidrawInitialDataState | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [showTokenPrompt, setShowTokenPrompt] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const pendingPayloadRef = useRef<SavePayload | null>(null);

  useEffect(() => {
    fetch(PUBLIC_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => setInitialData({ ...data, scrollToContent: true }))
      .catch(() => setLoadError(true));
  }, []);

  const executeSave = async (payload: SavePayload, token: string) => {
    setSaveStatus('saving');
    try {
      const response = await fetch('/api/excalidraw/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Save-Token': token,
        },
        body: JSON.stringify({ ...payload, filePath: FILE_PATH }),
      });
      if (response.status === 401) {
        sessionStorage.removeItem(SESSION_TOKEN_KEY);
        setSaveStatus('error');
        return;
      }
      const next: SaveStatus = response.ok ? 'saved' : 'error';
      setSaveStatus(next);
      if (next === 'saved') setTimeout(() => setSaveStatus('idle'), 3000);
    } catch {
      setSaveStatus('error');
    }
  };

  const handleSave = async (payload: SavePayload) => {
    const token = sessionStorage.getItem(SESSION_TOKEN_KEY);
    if (!token) {
      pendingPayloadRef.current = payload;
      setShowTokenPrompt(true);
      return;
    }
    await executeSave(payload, token);
  };

  const handleTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = tokenInput.trim();
    if (!token) return;
    sessionStorage.setItem(SESSION_TOKEN_KEY, token);
    setTokenInput('');
    setShowTokenPrompt(false);
    if (pendingPayloadRef.current) {
      const payload = pendingPayloadRef.current;
      pendingPayloadRef.current = null;
      await executeSave(payload, token);
    }
  };

  return (
    <section id="study-plan" className="scroll-mt-24 py-16">
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          SWE Study Plan
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Zero to Offer — interactive technical preparation roadmap. Edit and save changes directly to the repo.
        </p>
      </div>

      {loadError && (
        <div className="flex items-center justify-center h-40 rounded-xl border border-red-200 dark:border-red-800 text-red-500 text-sm">
          Failed to load diagram. Make sure the dev server has the diagram in public/excalidraw/.
        </div>
      )}

      {!loadError && !initialData && (
        <div className="flex items-center justify-center h-40 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-400 text-sm animate-pulse">
          Loading diagram…
        </div>
      )}

      {!loadError && initialData && (
        <div className="relative">
          <ExcalidrawWrapper
            initialData={initialData}
            onSave={handleSave}
            saveStatus={saveStatus}
          />

          {showTokenPrompt && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl z-20">
              <form
                onSubmit={handleTokenSubmit}
                className="bg-white dark:bg-zinc-900 rounded-xl p-6 shadow-2xl border border-zinc-200 dark:border-zinc-700 flex flex-col gap-3 w-80"
              >
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Enter Save Secret</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Matches the{' '}
                  <code className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1 rounded">SAVE_SECRET</code>{' '}
                  in your environment variables. Stored in sessionStorage for this session only.
                </p>
                <input
                  type="password"
                  autoFocus
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="••••••••••••••••"
                  className="text-sm px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowTokenPrompt(false); pendingPayloadRef.current = null; }}
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
