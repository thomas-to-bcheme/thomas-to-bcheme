#!/usr/bin/env npx tsx
/**
 * LinkedIn CLI - Standalone posting tool
 *
 * Usage:
 *   npx tsx scripts/linkedin-cli.ts list
 *   npx tsx scripts/linkedin-cli.ts post --file <filename> [--dry-run] [--visibility PUBLIC|CONNECTIONS]
 *   npx tsx scripts/linkedin-cli.ts post --content "..." [--dry-run] [--visibility PUBLIC|CONNECTIONS]
 *
 * Environment:
 *   LINKEDIN_ACCESS_TOKEN  - OAuth access token (required)
 *   LINKEDIN_PERSON_URN    - urn:li:person:<id> (required)
 *   LINKEDIN_DRY_RUN       - Set to "true" to skip actual posting
 *
 * Exit codes:
 *   0 - Success
 *   1 - User error (invalid args, file not found)
 *   2 - API error (auth, rate limit, service error)
 */

import fs from 'fs/promises';
import path from 'path';

// Types
interface CLIArgs {
  command: 'list' | 'post' | 'help';
  file?: string;
  content?: string;
  dryRun: boolean;
  visibility: 'PUBLIC' | 'CONNECTIONS';
  json: boolean;
}

// Terminal colors
const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

// Formatting helpers
function formatSuccess(message: string): string {
  return `${COLORS.green}✓${COLORS.reset} ${message}`;
}

function formatError(message: string): string {
  return `${COLORS.red}✗${COLORS.reset} ${message}`;
}

function formatHeader(title: string): string {
  return `\n${COLORS.bold}${title}${COLORS.reset}\n${'─'.repeat(title.length)}\n`;
}

// Load .env.local file manually (no external dependencies)
async function loadEnvFile(filePath: string): Promise<void> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) continue;
      const key = trimmed.slice(0, eqIndex);
      let value = trimmed.slice(eqIndex + 1);
      // Remove surrounding quotes
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      // Don't override existing env vars
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // File not found - acceptable, env vars may come from environment
  }
}

// Parse CLI arguments
function parseArgs(argv: string[]): CLIArgs {
  const args: CLIArgs = {
    command: 'help',
    dryRun: false,
    visibility: 'PUBLIC',
    json: false,
  };

  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];

    if (arg === 'list' || arg === 'post' || arg === 'help') {
      args.command = arg;
    } else if (arg === '--file' || arg === '-f') {
      args.file = argv[++i];
    } else if (arg === '--content' || arg === '-c') {
      args.content = argv[++i];
    } else if (arg === '--dry-run' || arg === '-n') {
      args.dryRun = true;
    } else if (arg === '--visibility' || arg === '-v') {
      const v = argv[++i]?.toUpperCase();
      if (v === 'PUBLIC' || v === 'CONNECTIONS') {
        args.visibility = v;
      }
    } else if (arg === '--json' || arg === '-j') {
      args.json = true;
    }
    i++;
  }

  return args;
}

// Print usage help
function printUsage(): void {
  console.log(`
LinkedIn CLI - Post to LinkedIn without starting a server

USAGE:
  npx tsx scripts/linkedin-cli.ts <command> [options]

COMMANDS:
  list                    List all validated posts
  post                    Publish to LinkedIn
  help                    Show this help message

OPTIONS:
  --file, -f <name>       Post filename (without .md extension)
  --content, -c <text>    Custom content to post
  --dry-run, -n           Simulate without posting
  --visibility, -v <vis>  PUBLIC or CONNECTIONS (default: PUBLIC)
  --json, -j              Output as JSON

EXAMPLES:
  # List available posts
  npx tsx scripts/linkedin-cli.ts list

  # Post from file (dry run)
  npx tsx scripts/linkedin-cli.ts post --file 2026-02-17-constraint-driven-architecture --dry-run

  # Post custom content
  npx tsx scripts/linkedin-cli.ts post --content "Hello LinkedIn!" --visibility CONNECTIONS

ENVIRONMENT:
  LINKEDIN_ACCESS_TOKEN   OAuth access token (required)
  LINKEDIN_PERSON_URN     urn:li:person:<id> (required)
  LINKEDIN_DRY_RUN        Set to "true" for dry-run mode
`);
}

// Handle list command
async function handleList(
  listFn: () => Promise<
    Array<{
      filename: string;
      content: string;
      metadata: { date: string; topic: string; target_audience: string };
    }>
  >,
  args: CLIArgs
): Promise<number> {
  const posts = await listFn();

  if (args.json) {
    console.log(
      JSON.stringify(
        {
          posts: posts.map((p) => ({
            filename: p.filename,
            date: p.metadata.date,
            topic: p.metadata.topic,
            targetAudience: p.metadata.target_audience,
            characterCount: p.content.length,
          })),
          count: posts.length,
        },
        null,
        2
      )
    );
  } else {
    console.log(formatHeader(`Available LinkedIn Posts (${posts.length} total)`));
    if (posts.length === 0) {
      console.log('No validated posts found in genAI/linkedin-posts/validated/');
    } else {
      posts.forEach((post, i) => {
        console.log(
          `${COLORS.cyan}${i + 1}.${COLORS.reset} ${COLORS.bold}${post.filename}${COLORS.reset}`
        );
        console.log(`   Topic: ${post.metadata.topic}`);
        console.log(`   Audience: ${post.metadata.target_audience}`);
        console.log(`   Characters: ${post.content.length.toLocaleString()}\n`);
      });
    }
  }

  return 0;
}

// Handle post command
async function handlePost(
  publishFn: (
    content: string,
    visibility: 'PUBLIC' | 'CONNECTIONS',
    accessToken: string,
    personUrn: string,
    dryRun: boolean
  ) => Promise<
    | { success: true; postId: string; dryRun: boolean }
    | { success: false; errorCode: string; message: string; rawError?: unknown }
  >,
  loadFn: (
    filename: string
  ) => Promise<{
    content: string;
    filename: string;
    metadata: { date: string; topic: string; target_audience: string };
  } | null>,
  args: CLIArgs,
  accessToken: string,
  personUrn: string
): Promise<number> {
  // Determine content source
  let content: string;
  let metadata: { filename?: string; topic?: string; date?: string } = {};

  if (args.file) {
    const post = await loadFn(args.file);
    if (!post) {
      const msg = `Post file not found: ${args.file}`;
      if (args.json) {
        console.log(JSON.stringify({ success: false, error: msg }));
      } else {
        console.error(formatError(msg));
        console.error(`  Check that the file exists in genAI/linkedin-posts/validated/`);
      }
      return 1;
    }
    content = post.content;
    metadata = {
      filename: post.filename,
      topic: post.metadata.topic,
      date: post.metadata.date,
    };
  } else if (args.content) {
    content = args.content;
  } else {
    const msg = 'Either --file or --content is required';
    if (args.json) {
      console.log(JSON.stringify({ success: false, error: msg }));
    } else {
      console.error(formatError(msg));
    }
    return 1;
  }

  // Determine dry-run mode
  const dryRun = args.dryRun || process.env.LINKEDIN_DRY_RUN === 'true';

  // Publish
  const result = await publishFn(content, args.visibility, accessToken, personUrn, dryRun);

  if (!result.success) {
    if (args.json) {
      console.log(
        JSON.stringify({ success: false, error: result.message, code: result.errorCode })
      );
    } else {
      console.error(formatError(`LinkedIn API Error: ${result.message}`));
      console.error(`  Error Code: ${result.errorCode}`);
    }
    return 2;
  }

  // Success output
  if (args.json) {
    console.log(
      JSON.stringify({
        success: true,
        postId: result.postId,
        dryRun: result.dryRun,
        metadata: {
          ...metadata,
          characterCount: content.length,
          visibility: args.visibility,
        },
      })
    );
  } else {
    console.log(formatHeader('LinkedIn Post Result'));
    console.log(formatSuccess(`Status: ${result.dryRun ? 'SUCCESS (dry-run)' : 'PUBLISHED'}`));
    console.log(`Post ID: ${result.postId}`);
    console.log(`\n${COLORS.dim}Content Preview:${COLORS.reset}`);
    console.log(content.slice(0, 200) + (content.length > 200 ? '...' : ''));
    console.log(`\n${COLORS.dim}Metadata:${COLORS.reset}`);
    if (metadata.filename) console.log(`  File: ${metadata.filename}`);
    if (metadata.topic) console.log(`  Topic: ${metadata.topic}`);
    console.log(`  Characters: ${content.length.toLocaleString()}`);
    console.log(`  Visibility: ${args.visibility}`);
  }

  return 0;
}

// Main entry point
async function main(): Promise<void> {
  // Load environment from .env.local
  await loadEnvFile(path.join(process.cwd(), '.env.local'));

  // Parse arguments
  const args = parseArgs(process.argv.slice(2));

  if (args.command === 'help') {
    printUsage();
    process.exit(0);
  }

  // Validate required environment
  const accessToken = process.env.LINKEDIN_ACCESS_TOKEN;
  const personUrn = process.env.LINKEDIN_PERSON_URN;

  if (args.command === 'post') {
    if (!accessToken) {
      console.error(formatError('LINKEDIN_ACCESS_TOKEN environment variable is not set'));
      process.exit(1);
    }

    if (!personUrn) {
      console.error(formatError('LINKEDIN_PERSON_URN environment variable is not set'));
      process.exit(1);
    }
  }

  // Dynamic imports (after env is loaded to ensure proper initialization)
  const { publishToLinkedIn } = await import('@/lib/linkedin/client');
  const { loadPost, listAvailablePosts } = await import('@/lib/linkedin/content-loader');

  // Execute command
  let exitCode: number;

  switch (args.command) {
    case 'list':
      exitCode = await handleList(listAvailablePosts, args);
      break;
    case 'post':
      exitCode = await handlePost(
        publishToLinkedIn,
        loadPost,
        args,
        accessToken!,
        personUrn!
      );
      break;
    default:
      printUsage();
      exitCode = 1;
  }

  process.exit(exitCode);
}

main().catch((error) => {
  console.error(formatError(`Unexpected error: ${error.message}`));
  process.exit(1);
});
