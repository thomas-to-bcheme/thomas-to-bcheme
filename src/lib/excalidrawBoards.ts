const BOARD_NAME_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;

export const DEFAULT_BOARD_NAME = 'technical_prep';

// Single source of truth for where board files live, used to derive every
// path below — kept exported so API routes can strip/match against it
// generically instead of re-declaring these strings themselves.
export const BOARDS_DIR = 'public/excalidraw';
export const BOARD_EXTENSION = '.excalidraw';

// Vercel serverless functions reject request bodies above ~4.5MB before the
// route handler ever runs, so the save path must warn/block client-side.
export const SAVE_PAYLOAD_WARN_BYTES = 3.5 * 1024 * 1024;
export const SAVE_PAYLOAD_HARD_LIMIT_BYTES = 4.5 * 1024 * 1024;

export function isValidBoardName(name: unknown): name is string {
  return typeof name === 'string' && BOARD_NAME_PATTERN.test(name);
}

export function boardFilePath(name: string): string {
  return `${BOARDS_DIR}/${name}${BOARD_EXTENSION}`;
}

export function boardPublicUrl(name: string): string {
  return `/excalidraw/${name}${BOARD_EXTENSION}`;
}

export function blankBoardScaffold() {
  return {
    type: 'excalidraw',
    version: 2,
    source: 'https://excalidraw.com',
    elements: [],
    appState: {},
    files: {},
  };
}
