import { NextResponse } from 'next/server';
import { getFileSha, putFile, GithubApiError } from '@/lib/github/client';
import { isValidBoardName, boardFilePath, blankBoardScaffold } from '@/lib/excalidrawBoards';

interface CreateRequestBody {
  name: string;
}

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

  const body: CreateRequestBody = await request.json();
  const { name } = body;

  if (!isValidBoardName(name)) {
    return NextResponse.json({ error: 'Invalid board name' }, { status: 400 });
  }

  const config = { owner, repo, token };
  const filePath = boardFilePath(name);

  try {
    const existing = await getFileSha(config, filePath);
    if (existing) {
      return NextResponse.json({ error: 'Board already exists' }, { status: 409 });
    }

    const contentBase64 = Buffer.from(JSON.stringify(blankBoardScaffold(), null, 2)).toString('base64');
    await putFile(config, filePath, contentBase64, undefined, `Create board ${name} — ${new Date().toISOString()}`);

    return NextResponse.json({ success: true, name });
  } catch (err) {
    const detail = err instanceof GithubApiError ? err.detail : String(err);
    const status = err instanceof GithubApiError ? err.status : 500;
    console.error('[excalidraw/create] GitHub create failed', { status, detail });
    return NextResponse.json({ error: 'Failed to create board on GitHub', detail }, { status: 502 });
  }
}
