import { NextResponse } from 'next/server';
import https from 'node:https';

const ALLOWED_FILE_PATHS = ['public/excalidraw/technical_prep.excalidraw'] as const;
type AllowedFilePath = typeof ALLOWED_FILE_PATHS[number];

interface SaveRequestBody {
  elements: unknown[];
  appState: Record<string, unknown>;
  files: Record<string, unknown>;
  filePath: string;
}

interface GithubResponse {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
  text: () => Promise<string>;
}

// Uses node:https instead of fetch/undici to avoid the 10s connect timeout
// that undici enforces on macOS dev environments. Follows 3xx redirects
// generically so renamed/moved repos resolve to their canonical URL.
function githubRequest(
  path: string,
  options: { method?: string; headers: Record<string, string>; body?: string },
  timeoutMs = 30_000,
  redirectsRemaining = 3
): Promise<GithubResponse> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'api.github.com',
        path,
        method: options.method ?? 'GET',
        headers: options.headers,
        timeout: timeoutMs,
      },
      (res) => {
        const status = res.statusCode ?? 500;

        if (status >= 300 && status < 400 && res.headers.location) {
          res.resume(); // drain body so the socket is released
          if (redirectsRemaining <= 0) {
            reject(new Error('Too many redirects from GitHub API'));
            return;
          }
          try {
            const redirectUrl = new URL(res.headers.location);
            resolve(githubRequest(redirectUrl.pathname + redirectUrl.search, options, timeoutMs, redirectsRemaining - 1));
          } catch (err) {
            reject(err);
          }
          return;
        }

        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf-8');
          resolve({
            ok: status >= 200 && status < 300,
            status,
            json: () => Promise.resolve(JSON.parse(raw)),
            text: () => Promise.resolve(raw),
          });
        });
      }
    );
    req.on('timeout', () => {
      req.destroy(new Error(`GitHub API request timed out after ${timeoutMs}ms`));
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
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

  const body: SaveRequestBody = await request.json();
  const { elements, appState, files, filePath } = body;

  if (!filePath || !ALLOWED_FILE_PATHS.includes(filePath as AllowedFilePath)) {
    return NextResponse.json({ error: 'filePath not allowed' }, { status: 400 });
  }

  const githubHeaders = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
    'User-Agent': 'thomas-to-bcheme-portfolio',
  };

  // Step A: fetch current file SHA
  const getResponse = await githubRequest(
    `/repos/${owner}/${repo}/contents/${filePath}`,
    { headers: githubHeaders }
  );

  if (!getResponse.ok) {
    const detail = await getResponse.text();
    console.error('[excalidraw/save] GitHub GET failed', { status: getResponse.status, detail });
    return NextResponse.json(
      { error: 'Failed to fetch current file from GitHub', githubStatus: getResponse.status, detail },
      { status: 502 }
    );
  }

  const { sha } = await getResponse.json() as { sha: string };

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

  // Step B: commit updated file
  const putResponse = await githubRequest(
    `/repos/${owner}/${repo}/contents/${filePath}`,
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
    console.error('[excalidraw/save] GitHub PUT failed', { status: putResponse.status, detail });
    return NextResponse.json(
      { error: 'Failed to commit file to GitHub', githubStatus: putResponse.status, detail },
      { status: 502 }
    );
  }

  return NextResponse.json({ success: true });
}
