import { NextResponse } from 'next/server';
import { listDirectory, GithubApiError } from '@/lib/github/client';
import { BOARDS_DIR, BOARD_EXTENSION } from '@/lib/excalidrawBoards';

export async function GET() {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_REPO_OWNER;
  const repo = process.env.GITHUB_REPO_NAME;

  if (!token || !owner || !repo) {
    return NextResponse.json(
      { error: 'Missing required env vars: GITHUB_TOKEN, GITHUB_REPO_OWNER, GITHUB_REPO_NAME' },
      { status: 500 }
    );
  }

  try {
    const entries = await listDirectory({ owner, repo, token }, BOARDS_DIR);
    const boards = entries
      .filter((entry) => entry.type === 'file' && entry.name.endsWith(BOARD_EXTENSION))
      .map((entry) => entry.name.slice(0, -BOARD_EXTENSION.length));
    return NextResponse.json({ boards });
  } catch (err) {
    const detail = err instanceof GithubApiError ? err.detail : String(err);
    const status = err instanceof GithubApiError ? err.status : 500;
    // This route is unauthenticated (filenames aren't sensitive), so unlike
    // save/create, GitHub error detail is logged server-side only rather
    // than echoed to the client.
    console.error('[excalidraw/list] GitHub listing failed', { status, detail });
    return NextResponse.json({ error: 'Failed to list boards from GitHub' }, { status: 502 });
  }
}
