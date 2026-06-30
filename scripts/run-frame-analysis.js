#!/usr/bin/env node
'use strict';

const { fork } = require('child_process');
const fs = require('fs');
const path = require('path');

const FRAMES = [
  { id: 'AkAD--wNUODkfDX4PQdv', name: 'Reading List',                      pillar: 'Technical Depth',     seq: 1 },
  { id: 'ffsumuKvuZ2hOPgCfjZA', name: 'Practical Coding',                  pillar: 'Technical Depth',     seq: 2 },
  { id: 'QOUb4KZXFqglQsoA3RDs', name: 'Architecture Concepts',             pillar: 'Systems Thinking',    seq: 3 },
  { id: 'HnMfl3zUaLJez2eI6LWk', name: 'System Architecture Diagram',       pillar: 'Systems Thinking',    seq: 4 },
  { id: 'rEX9ZkQmLMonBL9XY3xl', name: 'System Design Interview Framework', pillar: 'Interview Readiness', seq: 5 },
  { id: 'w2p0C7PxHocij1rwyX1el', name: 'Communication Frameworks',         pillar: 'Interview Readiness', seq: 6 },
];

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 2) {
    const key = argv[i].replace(/^--/, '');
    args[key] = argv[i + 1];
  }
  return args;
}

function runFrame(frame, outputDir) {
  return new Promise((resolve, reject) => {
    const outputPath = path.join(outputDir, `frame_analysis_${frame.seq}.json`);
    const workerPath = path.resolve(__dirname, 'analyze-frame.js');

    const child = fork(workerPath, [
      '--frame-id', frame.id,
      '--frame-name', frame.name,
      '--pillar', frame.pillar,
      '--seq', String(frame.seq),
      '--output', outputPath,
    ], { stdio: 'inherit' });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve({ frame: frame.name, outputPath });
      } else {
        reject(new Error(`analyze-frame exited with code ${code} for frame: ${frame.name}`));
      }
    });

    child.on('error', (err) => {
      reject(new Error(`Failed to fork analyze-frame for ${frame.name}: ${err.message}`));
    });
  });
}

async function main() {
  const args = parseArgs(process.argv);
  const outputDir = args['output-dir'] ?? path.resolve(__dirname, '../.frame-analysis');

  fs.mkdirSync(outputDir, { recursive: true });

  console.log(`\n[run-frame-analysis] Running ${FRAMES.length} frame workers in parallel`);
  console.log(`[run-frame-analysis] Output dir: ${outputDir}\n`);

  const results = await Promise.all(FRAMES.map((frame) => runFrame(frame, outputDir)));

  console.log('\n[run-frame-analysis] Summary:');
  for (const { frame, outputPath } of results) {
    console.log(`  ✓ ${frame.padEnd(38)} → ${outputPath}`);
  }
  console.log(`\n[run-frame-analysis] All ${FRAMES.length} frames analyzed successfully\n`);
}

main().catch((err) => {
  console.error(`\n[run-frame-analysis] FAILED: ${err.message}`);
  process.exit(1);
});
