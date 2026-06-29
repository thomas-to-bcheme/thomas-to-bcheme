import { NextResponse } from 'next/server';

const GITHUB_API = 'https://api.github.com';
const ALLOWED_FILE_PATHS = ['public/excalidraw/technical_prep.excalidraw'] as const;
type AllowedFilePath = typeof ALLOWED_FILE_PATHS[number];

interface SaveRequestBody {
  elements: unknown[];
  appState: Record<string, unknown>;
  files: Record<string, unknown>;
  filePath: string;
}

export async function POST(request: Request) {
  // Authorization: require SAVE_SECRET to match X-Save-Token header
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

  if (!filePath || !ALLOWED_FILE_PATHS.includes(filePath as AllowedFilePath)) {
    return NextResponse.json({ error: 'filePath not allowed' }, { status: 400 });
  }

  const githubHeaders = {
    Authorization: `token ${token}`,
    Accept: 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
  };

  // Step A: fetch current file SHA
  const getResponse = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/contents/${filePath}`,
    { headers: githubHeaders }
  );

  if (!getResponse.ok) {
    const detail = await getResponse.text();
    return NextResponse.json(
      { error: 'Failed to fetch current file from GitHub', detail },
      { status: 502 }
    );
  }

  const { sha } = await getResponse.json() as { sha: string };

  // Build updated excalidraw JSON
  const updatedContent = JSON.stringify(
    { type: 'excalidraw', version: 2, source: 'https://excalidraw.com', elements, appState, files },
    null,
    2
  );
  const contentBase64 = Buffer.from(updatedContent).toString('base64');
  const filename = filePath.split('/').pop() ?? filePath;

  // Step B: commit updated file
  const putResponse = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/contents/${filePath}`,
    {
      method: 'PUT',
      headers: githubHeaders,
      body: JSON.stringify({
        message: `Update ${filename} — ${new Date().toISOString()}`,
        content: contentBase64,
        sha,
      }),
    }
  );

  if (!putResponse.ok) {
    const detail = await putResponse.text();
    return NextResponse.json(
      { error: 'Failed to commit file to GitHub', detail },
      { status: 502 }
    );
  }

  return NextResponse.json({ success: true });
}
