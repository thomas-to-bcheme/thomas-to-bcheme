#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 2) {
    const key = argv[i].replace(/^--/, '');
    args[key] = argv[i + 1];
  }
  return args;
}

function detectPattern(arrows, rectangles) {
  if (arrows.length === 0) return 'text-only';
  if (arrows.length > 10) return 'tree-graph';
  return 'fan-out';
}

function extractKeyTextNodes(elements, frameName) {
  return elements
    .filter((el) => el.type === 'text' && el.text && el.text.trim())
    .map((el) => el.text.trim().split('\n')[0].trim())
    .filter((t) => t && t !== frameName && t.length <= 200)
    .slice(0, 6);
}

function buildDomainBoxContent(frameName, keyTextNodes, pattern) {
  const MAX_NODES = 4;
  const bullets = keyTextNodes
    .slice(0, MAX_NODES)
    .map((t) => (t.length > 48 ? `${t.slice(0, 45)}…` : t))
    .map((t) => `• ${t}`)
    .join('\n');
  const suffix = keyTextNodes.length > MAX_NODES ? '\n…' : '';
  return `${frameName}\n\n${bullets}${suffix}`;
}

function main() {
  const args = parseArgs(process.argv);
  const required = ['frame-id', 'frame-name', 'pillar', 'seq', 'output'];
  for (const key of required) {
    if (!args[key]) {
      console.error(`Missing required arg: --${key}`);
      process.exit(1);
    }
  }

  const excalidrawPath = path.resolve(
    __dirname,
    '../public/excalidraw/technical_prep.excalidraw'
  );
  const raw = fs.readFileSync(excalidrawPath, 'utf8');
  const data = JSON.parse(raw);

  const frameElements = (data.elements ?? []).filter(
    (el) => el.frameId === args['frame-id']
  );

  const rectangles = frameElements.filter((el) => el.type === 'rectangle');
  const texts = frameElements.filter((el) => el.type === 'text');
  const arrows = frameElements.filter((el) => el.type === 'arrow');

  const pattern = detectPattern(arrows, rectangles);
  const keyTextNodes = extractKeyTextNodes(frameElements, args['frame-name']);
  const domainBoxContent = buildDomainBoxContent(
    args['frame-name'],
    keyTextNodes,
    pattern
  );

  const arrowGraph = arrows.map((a) => ({
    from: a.startBinding?.elementId ?? null,
    to: a.endBinding?.elementId ?? null,
  }));

  const output = {
    frameId: args['frame-id'],
    frameName: args['frame-name'],
    pillar: args['pillar'],
    seq: parseInt(args['seq'], 10),
    elementCount: frameElements.length,
    elementTypes: {
      rectangle: rectangles.length,
      text: texts.length,
      arrow: arrows.length,
    },
    visualPattern: pattern,
    keyTextNodes,
    arrowGraph,
    domainBoxContent,
  };

  fs.writeFileSync(args['output'], JSON.stringify(output, null, 2), 'utf8');
  console.log(`[analyze-frame] ${args['frame-name']} → ${args['output']}`);
}

main();
