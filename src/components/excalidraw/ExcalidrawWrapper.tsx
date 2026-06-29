'use client';

import { Excalidraw } from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';
import { useState } from 'react';
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
}

export default function ExcalidrawWrapper({ initialData, onSave, saveStatus, viewModeEnabled }: ExcalidrawWrapperProps) {
  const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawImperativeAPI | null>(null);

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
      className="relative w-full h-[600px] rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800"
      onKeyDown={(e) => {
        if (e.code === 'Space') {
          // Only block browser page-scroll when NOT typing — Excalidraw creates a
          // <textarea> for text elements, and unconditional preventDefault swallows spaces.
          const target = e.target as HTMLElement;
          const isTextInput =
            target.tagName === 'TEXTAREA' ||
            target.tagName === 'INPUT' ||
            target.isContentEditable;
          if (!isTextInput) e.preventDefault();
        }
      }}
      onClickCapture={(e) => {
        // Excalidraw uses <a href="#"> for toolbar/dialog triggers. Without this, the
        // browser processes the "#" fragment and scrolls the page to the top.
        const anchor = (e.target as HTMLElement).closest('a[href="#"]');
        if (anchor) e.preventDefault();
      }}
    >
      <Excalidraw
        initialData={initialData}
        excalidrawAPI={(api) => setExcalidrawAPI(api)}
        viewModeEnabled={viewModeEnabled}
      />
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
