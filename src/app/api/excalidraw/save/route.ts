import { NextResponse } from 'next/server';
import { getFileSha, putFile, GithubApiError } from '@/lib/github/client';
import { isValidBoardName, boardFilePath, BOARDS_DIR, BOARD_EXTENSION } from '@/lib/excalidrawBoards';

interface SaveRequestBody {
  elements: unknown[];
  appState: Record<string, unknown>;
  files: Record<string, unknown>;
  filePath: string;
}

const BOARDS_PREFIX = `${BOARDS_DIR}/`;

// Reconstructs the board name a client-supplied filePath claims to point at,
// validating it against the shared board-name pattern rather than checking
// against a fixed allowlist. Returns null for anything malformed or that
// doesn't round-trip back to the exact same path (blocks traversal).
function resolveBoardName(filePath: string): string | null {
  if (!filePath.startsWith(BOARDS_PREFIX) || !filePath.endsWith(BOARD_EXTENSION)) return null;
  const name = filePath.slice(BOARDS_PREFIX.length, -BOARD_EXTENSION.length);
  if (!isValidBoardName(name)) return null;
  if (boardFilePath(name) !== filePath) return null;
  return name;
}

const SIZE_ERROR_STATUSES = new Set([403, 413, 422]);

export async function POST(request: Request) {
  const saveSecret = process.env.SAVE_SECRET;
  if (!saveSecret) {
    return NextResponse.json({ error: 'Server configuration error: SAVE_SECRET not set' }, { status: 500 });
  }
  const incomingToken = request.headers.get('X-Save-Token');
  if (!incomingToken || incomingToken !== saveSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_REPO_OWNER;
  const repo = process.env.GITHUB_REPO_NAME;

  if (!token || !owner || !repo) {
    return NextResponse.json(
      { error: 'Missing required env vars: GITHUB_TOKEN, GITHUB_REPO_OWNER, GITHUB_REPO_NAME' },
      { status: 500 }
    );
  }

  const body: SaveRequestBody = await request.json();
  const { elements, appState, files, filePath } = body;

  const boardName = filePath ? resolveBoardName(filePath) : null;
  if (!boardName) {
    return NextResponse.json({ error: 'filePath not allowed' }, { status: 400 });
  }

  const config = { owner, repo, token };

  let existing;
  try {
    existing = await getFileSha(config, filePath);
  } catch (err) {
    const detail = err instanceof GithubApiError ? err.detail : String(err);
    const status = err instanceof GithubApiError ? err.status : 500;
    console.error('[excalidraw/save] GitHub GET failed', { status, detail });
    return NextResponse.json({ error: 'Failed to fetch current file from GitHub', githubStatus: status, detail }, { status: 502 });
  }

  if (!existing) {
    return NextResponse.json({ error: 'Board not found' }, { status: 404 });
  }

  // Strip collaborators/followedBy (Map/Set at runtime — serialize to {} via
  // JSON.stringify, then crash when Excalidraw's prod bundle calls .forEach()/.has()
  // on the restored plain object expecting a Map/Set) and known-transient/incidental
  // UI state reflecting whatever the editor was mid-doing at save time, not the
  // diagram's actual persisted structure.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const {
    collaborators: _col,
    followedBy: _fb,
    contextMenu: _contextMenu,
    toast: _toast,
    openDialog: _openDialog,
    openPopup: _openPopup,
    openSidebar: _openSidebar,
    resizingElement: _resizingElement,
    newElement: _newElement,
    editingLinearElement: _editingLinearElement,
    selectionElement: _selectionElement,
    ...persistableAppState
  } = appState;
  // Strip ephemeral selection elements — they're tool state, not diagram content.
  const persistableElements = (elements as Array<{ type?: string }>).filter(el => el.type !== 'selection');
  const updatedContent = JSON.stringify(
    { type: 'excalidraw', version: 2, source: 'https://excalidraw.com', elements: persistableElements, appState: persistableAppState, files },
    null,
    2
  );
  const contentBase64 = Buffer.from(updatedContent).toString('base64');
  const filename = filePath.split('/').pop() ?? filePath;

  try {
    await putFile(config, filePath, contentBase64, existing.sha, `Update ${filename} — ${new Date().toISOString()}`);
  } catch (err) {
    if (err instanceof GithubApiError) {
      console.error('[excalidraw/save] GitHub PUT failed', { status: err.status, detail: err.detail });
      if (SIZE_ERROR_STATUSES.has(err.status)) {
        return NextResponse.json(
          { error: 'board_too_large', githubStatus: err.status, detail: err.detail },
          { status: 413 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to commit file to GitHub', githubStatus: err.status, detail: err.detail },
        { status: 502 }
      );
    }
    throw err;
  }

  return NextResponse.json({ success: true });
}
