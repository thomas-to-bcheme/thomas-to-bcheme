#!/usr/bin/env node
'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const DEFAULT_ANALYSIS_DIR = path.resolve(__dirname, '../.frame-analysis');

function parseArgs(argv) {
  const args = { 'dry-run': false, 'skip-analysis': false };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--dry-run') { args['dry-run'] = true; continue; }
    if (argv[i] === '--skip-analysis') { args['skip-analysis'] = true; continue; }
    if (argv[i].startsWith('--')) { args[argv[i].replace(/^--/, '')] = argv[i + 1]; i++; }
  }
  return args;
}

function runStep(label, cmd) {
  const start = Date.now();
  console.log(`\n[${new Date().toISOString()}] ▶  ${label}`);
  console.log(`  $ ${cmd}\n`);
  try {
    execSync(cmd, { stdio: 'inherit', cwd: path.resolve(__dirname, '..') });
    console.log(`\n  ✓ ${label} (${Date.now() - start}ms)`);
  } catch (err) {
    console.error(`\n  ✗ FAILED: ${label}`);
    throw new Error(`Step "${label}" exited non-zero`);
  }
}

async function main() {
  const args = parseArgs(process.argv);
  const analysisDir = args['output-dir'] ?? DEFAULT_ANALYSIS_DIR;
  const isDryRun = args['dry-run'];
  const skipAnalysis = args['skip-analysis'];

  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║       Senior → Staff Mastery Map Builder     ║');
  console.log('╚══════════════════════════════════════════════╝');
  if (isDryRun) console.log('\n  MODE: DRY RUN');

  fs.mkdirSync(analysisDir, { recursive: true });

  if (!skipAnalysis) {
    runStep(
      'Step 1: Parallel frame analysis (6 subagents)',
      `node scripts/run-frame-analysis.js --output-dir "${analysisDir}"`
    );
  } else {
    console.log('\n[build-mastery-map] Skipping Step 1 (--skip-analysis)');
  }

  const dryRunFlag = isDryRun ? ' --dry-run' : '';
  runStep(
    'Step 2: Generate synthesis frame elements',
    `node scripts/generate-synthesis-frame.js --analysis-dir "${analysisDir}"${dryRunFlag}`
  );

  if (!isDryRun) {
    runStep(
      'Step 3: Fix excalidraw fractional indices',
      'node scripts/fix-excalidraw-indices.js'
    );

    runStep(
      'Step 4: Validate synthesis frame structure',
      'node scripts/validate-synthesis-frame.js'
    );
  }

  console.log('\n╔══════════════════════════════════════════════╗');
  console.log(isDryRun
    ? '║    Dry run complete — no files were written   ║'
    : '║       Build complete — all steps passed       ║'
  );
  console.log('╚══════════════════════════════════════════════╝\n');
}

main().catch((err) => {
  console.error(`\n[build-mastery-map] PIPELINE FAILED: ${err.message}`);
  process.exit(1);
});
