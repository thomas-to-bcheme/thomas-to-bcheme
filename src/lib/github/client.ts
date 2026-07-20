import https from 'node:https';

export interface GithubConfig {
  owner: string;
  repo: string;
  token: string;
}

export interface GithubDirEntry {
  name: string;
  path: string;
  type: 'file' | 'dir';
}

export class GithubApiError extends Error {
  constructor(public status: number, public detail: string) {
    super(`GitHub API ${status}`);
  }
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

function buildHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
    'User-Agent': 'thomas-to-bcheme-portfolio',
  };
}

export async function getFileSha(config: GithubConfig, path: string): Promise<{ sha: string } | null> {
  const res = await githubRequest(
    `/repos/${config.owner}/${config.repo}/contents/${path}`,
    { headers: buildHeaders(config.token) }
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new GithubApiError(res.status, await res.text());
  const { sha } = (await res.json()) as { sha: string };
  return { sha };
}

export async function putFile(
  config: GithubConfig,
  path: string,
  contentBase64: string,
  sha: string | undefined,
  message: string
): Promise<void> {
  const res = await githubRequest(
    `/repos/${config.owner}/${config.repo}/contents/${path}`,
    {
      method: 'PUT',
      headers: buildHeaders(config.token),
      // sha omitted entirely (not null) when absent — GitHub's Contents API
      // requires the key to be absent for a create-not-update PUT, and
      // JSON.stringify already drops keys whose value is undefined.
      body: JSON.stringify({ message, content: contentBase64, sha }),
    }
  );
  if (!res.ok) throw new GithubApiError(res.status, await res.text());
}

export async function listDirectory(config: GithubConfig, path: string): Promise<GithubDirEntry[]> {
  const res = await githubRequest(
    `/repos/${config.owner}/${config.repo}/contents/${path}`,
    { headers: buildHeaders(config.token) }
  );
  if (!res.ok) throw new GithubApiError(res.status, await res.text());
  return (await res.json()) as GithubDirEntry[];
}
