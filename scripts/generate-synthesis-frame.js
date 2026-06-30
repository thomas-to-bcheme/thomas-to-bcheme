#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const SYNTHESIS_FRAME_ID = 'frame_synth_mastery_map';
const EXCALIDRAW_PATH = path.resolve(__dirname, '../public/excalidraw/technical_prep.excalidraw');
const FRAMES_JSON_PATH = path.resolve(__dirname, '../public/excalidraw/frames.json');

const NOW = Date.now();

function parseArgs(argv) {
  const args = { 'dry-run': false };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--dry-run') { args['dry-run'] = true; continue; }
    if (argv[i].startsWith('--')) { args[argv[i].replace(/^--/, '')] = argv[i + 1]; i++; }
  }
  return args;
}

function loadAnalysisFiles(analysisDir) {
  const domainText = {};
  const files = fs.readdirSync(analysisDir).filter((f) => f.startsWith('frame_analysis_'));
  if (files.length === 0) throw new Error(`No frame_analysis_*.json files found in ${analysisDir}`);
  for (const file of files) {
    const data = JSON.parse(fs.readFileSync(path.join(analysisDir, file), 'utf8'));
    domainText[data.frameName] = data.domainBoxContent;
  }
  return domainText;
}

// ─── Element builders ────────────────────────────────────────────────────────

function baseProps(id, type, x, y, w, h, overrides = {}) {
  return {
    id,
    type,
    x,
    y,
    width: w,
    height: h,
    angle: 0,
    fillStyle: 'solid',
    strokeWidth: 2,
    strokeStyle: 'solid',
    roughness: 0,
    opacity: 100,
    groupIds: [],
    frameId: SYNTHESIS_FRAME_ID,
    boundElements: [],
    isDeleted: false,
    locked: false,
    link: null,
    updated: NOW,
    version: 1,
    versionNonce: 1,
    seed: 1,
    ...overrides,
  };
}

function makeRect(id, x, y, w, h, props = {}) {
  return baseProps(id, 'rectangle', x, y, w, h, {
    roundness: { type: 1 },
    strokeColor: '#1e1e1e',
    backgroundColor: 'transparent',
    ...props,
  });
}

function makeText(id, containerId, x, y, w, h, text, props = {}) {
  return baseProps(id, 'text', x, y, w, h, {
    text,
    originalText: text,
    fontSize: 12,
    fontFamily: 1,
    textAlign: 'center',
    verticalAlign: 'middle',
    lineHeight: 1.25,
    autoResize: true,
    containerId,
    strokeColor: '#1e1e1e',
    backgroundColor: 'transparent',
    ...props,
  });
}

function makeArrow(id, fromId, toId, x, y, points, props = {}) {
  const [, [dx, dy]] = points;
  return baseProps(id, 'arrow', x, y, Math.abs(dx), Math.abs(dy), {
    points,
    startArrowhead: null,
    endArrowhead: 'arrow',
    startBinding: {
      elementId: fromId,
      mode: 'orbit',
      fixedPoint: props.startFixedPoint ?? [0.5, 1],
      focus: 0,
    },
    endBinding: {
      elementId: toId,
      mode: 'orbit',
      fixedPoint: props.endFixedPoint ?? [0.5, 0],
      focus: 0,
    },
    backgroundColor: 'transparent',
    lastCommittedPoint: null,
    elbowed: false,
    strokeColor: props.strokeColor ?? '#1e1e1e',
    strokeWidth: props.strokeWidth ?? 2,
    strokeStyle: props.strokeStyle ?? 'solid',
    roughness: 0,
    fillStyle: 'solid',
  });
}

// ─── Build all 37 elements ────────────────────────────────────────────────────

function buildElements(domainText) {
  const elements = [];
  const rectById = new Map();

  function addRect(id, x, y, w, h, props = {}) {
    const rect = makeRect(id, x, y, w, h, props);
    elements.push(rect);
    rectById.set(id, rect);
    return rect;
  }

  function addPair(rectId, textId, x, y, w, h, text, rectProps = {}, textProps = {}) {
    const rect = addRect(rectId, x, y, w, h, rectProps);
    const textEl = makeText(textId, rectId, x, y, w, h, text, textProps);
    rect.boundElements.push({ id: textId, type: 'text' });
    elements.push(textEl);
    return rect;
  }

  // 1. Frame element (frameId must be null)
  elements.push({
    id: SYNTHESIS_FRAME_ID,
    type: 'frame',
    name: 'Senior → Staff Mastery Map',
    x: 5600, y: 180, width: 3600, height: 1500,
    angle: 0,
    strokeColor: '#868e96',
    backgroundColor: 'transparent',
    fillStyle: 'solid',
    strokeWidth: 2,
    strokeStyle: 'solid',
    roughness: 0,
    opacity: 100,
    groupIds: [],
    frameId: null,
    roundness: null,
    boundElements: [],
    isDeleted: false,
    locked: false,
    link: null,
    updated: NOW,
    version: 1,
    versionNonce: 1,
    seed: 1,
  });

  // 2. Title row
  addPair(
    'rect_synth_title', 'text_synth_title',
    5720, 240, 3360, 80,
    'Senior → Staff Mastery Map',
    { strokeColor: '#e67700', backgroundColor: '#fff3bf', roundness: null },
    { fontSize: 22 }
  );

  // 3. Learning path banner
  addPair(
    'rect_synth_path_banner', 'text_synth_path_banner',
    5720, 340, 3360, 44,
    'Learning Path:  Technical Depth  →  Systems Thinking  →  Interview Readiness',
    { strokeColor: '#868e96', backgroundColor: '#f8f9fa', roundness: null },
    { fontSize: 12 }
  );

  // 4. Pillar background columns (no text, behind everything)
  addRect('rect_pillar_bg_tech', 5720, 400, 1060, 680, {
    strokeColor: '#2f9e44', backgroundColor: '#f4fce3', roundness: null,
  });
  addRect('rect_pillar_bg_sys', 6840, 400, 1060, 680, {
    strokeColor: '#7048e8', backgroundColor: '#f3f0ff', roundness: null,
  });
  addRect('rect_pillar_bg_int', 7960, 400, 1060, 680, {
    strokeColor: '#e67700', backgroundColor: '#fff9db', roundness: null,
  });

  // 5. Pillar headers (on top of bg columns)
  addPair(
    'rect_pillar_hdr_tech', 'text_pillar_hdr_tech',
    5720, 400, 1060, 60,
    'Technical Depth',
    { strokeColor: '#2f9e44', backgroundColor: '#d3f9d8', roundness: null },
    { fontSize: 15 }
  );
  addPair(
    'rect_pillar_hdr_sys', 'text_pillar_hdr_sys',
    6840, 400, 1060, 60,
    'Systems Thinking',
    { strokeColor: '#7048e8', backgroundColor: '#e5dbff', roundness: null },
    { fontSize: 15 }
  );
  addPair(
    'rect_pillar_hdr_int', 'text_pillar_hdr_int',
    7960, 400, 1060, 60,
    'Interview Readiness',
    { strokeColor: '#e67700', backgroundColor: '#ffec99', roundness: null },
    { fontSize: 15 }
  );

  // 6. Domain boxes — upper row
  //    Pillar 1 top: Reading List (seq 1)
  addPair(
    'rect_synth_reading', 'text_synth_reading',
    5740, 480, 1020, 260,
    domainText['Reading List'] ?? 'Reading List',
    { strokeColor: '#2f9e44', backgroundColor: '#ebfbee' },
    { fontSize: 11, textAlign: 'left', verticalAlign: 'top' }
  );
  //    Pillar 2 top: Architecture Concepts (seq 3)
  addPair(
    'rect_synth_arch', 'text_synth_arch',
    6860, 480, 1020, 260,
    domainText['Architecture Concepts'] ?? 'Architecture Concepts',
    { strokeColor: '#7048e8', backgroundColor: '#ede7f6' },
    { fontSize: 11, textAlign: 'left', verticalAlign: 'top' }
  );
  //    Pillar 3 top: System Design Interview Framework (seq 5)
  addPair(
    'rect_synth_sdframework', 'text_synth_sdframework',
    7980, 480, 1020, 260,
    domainText['System Design Interview Framework'] ?? 'System Design Interview Framework',
    { strokeColor: '#e67700', backgroundColor: '#fff4e6' },
    { fontSize: 11, textAlign: 'left', verticalAlign: 'top' }
  );

  // 7. Domain boxes — lower row
  //    Pillar 1 bottom: Practical Coding (seq 2)
  addPair(
    'rect_synth_coding', 'text_synth_coding',
    5740, 800, 1020, 260,
    domainText['Practical Coding'] ?? 'Practical Coding',
    { strokeColor: '#2f9e44', backgroundColor: '#ebfbee' },
    { fontSize: 11, textAlign: 'left', verticalAlign: 'top' }
  );
  //    Pillar 2 bottom: System Architecture Diagram (seq 4)
  addPair(
    'rect_synth_sysarch', 'text_synth_sysarch',
    6860, 800, 1020, 260,
    domainText['System Architecture Diagram'] ?? 'System Architecture Diagram',
    { strokeColor: '#7048e8', backgroundColor: '#ede7f6' },
    { fontSize: 11, textAlign: 'left', verticalAlign: 'top' }
  );
  //    Pillar 3 bottom: Communication Frameworks (seq 6)
  addPair(
    'rect_synth_comm', 'text_synth_comm',
    7980, 800, 1020, 260,
    domainText['Communication Frameworks'] ?? 'Communication Frameworks',
    { strokeColor: '#e67700', backgroundColor: '#fff4e6' },
    { fontSize: 11, textAlign: 'left', verticalAlign: 'top' }
  );

  // 8. Staff output row
  addPair(
    'rect_synth_staff_output', 'text_synth_staff_output',
    5720, 1120, 3360, 100,
    'Staff Engineer Output:\nDrive architectural decisions  →  Mentor & grow teams  →  Lead technical strategy',
    { strokeColor: '#c2255c', backgroundColor: '#fff0f6', roundness: null },
    { fontSize: 13 }
  );

  // 9. Legend row
  addPair(
    'rect_synth_legend', 'text_synth_legend',
    5720, 1260, 3360, 140,
    '→ Solid: Sequential learning within pillar        ⟹ Thick: Competency pillar progression        - → Dashed: Cross-domain knowledge transfer',
    { strokeColor: '#868e96', backgroundColor: '#f8f9fa', roundness: null },
    { fontSize: 11 }
  );

  // 10. Arrows
  const arrows = [
    // Within Pillar 1: Reading List ↓ Practical Coding
    makeArrow(
      'arrow_reading_to_coding',
      'rect_synth_reading', 'rect_synth_coding',
      6250, 740,             // center-x Pillar 1 = 5740+510; bottom-y reading = 480+260
      [[0, 0], [0, 60]],
      { strokeColor: '#2f9e44', strokeWidth: 2, startFixedPoint: [0.5, 1], endFixedPoint: [0.5, 0] }
    ),
    // Within Pillar 2: Architecture Concepts ↓ System Architecture Diagram
    makeArrow(
      'arrow_arch_to_sysarch',
      'rect_synth_arch', 'rect_synth_sysarch',
      7370, 740,             // center-x Pillar 2 = 6860+510; bottom-y arch = 480+260
      [[0, 0], [0, 60]],
      { strokeColor: '#7048e8', strokeWidth: 2, startFixedPoint: [0.5, 1], endFixedPoint: [0.5, 0] }
    ),
    // Within Pillar 3: Communication Frameworks ↑ SD Interview Framework
    makeArrow(
      'arrow_comm_to_sdframework',
      'rect_synth_comm', 'rect_synth_sdframework',
      8490, 800,             // center-x Pillar 3 = 7980+510; top-y comm = 800
      [[0, 0], [0, -60]],
      { strokeColor: '#e67700', strokeWidth: 2, strokeStyle: 'dashed', startFixedPoint: [0.5, 0], endFixedPoint: [0.5, 1] }
    ),
    // Pillar 1 → 2: Technical Depth → Systems Thinking (thick black, at header level)
    makeArrow(
      'arrow_td_to_st',
      'rect_pillar_hdr_tech', 'rect_pillar_hdr_sys',
      6780, 430,             // right edge hdr_tech = 5720+1060; center-y header = 400+30
      [[0, 0], [60, 0]],
      { strokeColor: '#1e1e1e', strokeWidth: 4, startFixedPoint: [1, 0.5], endFixedPoint: [0, 0.5] }
    ),
    // Pillar 2 → 3: Systems Thinking → Interview Readiness (thick black, at header level)
    makeArrow(
      'arrow_st_to_ir',
      'rect_pillar_hdr_sys', 'rect_pillar_hdr_int',
      7900, 430,             // right edge hdr_sys = 6840+1060; center-y = 430
      [[0, 0], [60, 0]],
      { strokeColor: '#1e1e1e', strokeWidth: 4, startFixedPoint: [1, 0.5], endFixedPoint: [0, 0.5] }
    ),
    // Cross-domain: Reading List → Architecture Concepts (gray dashed)
    makeArrow(
      'arrow_reading_to_arch',
      'rect_synth_reading', 'rect_synth_arch',
      6760, 610,             // right edge reading = 5740+1020; mid-y reading = 480+130
      [[0, 0], [100, 0]],
      { strokeColor: '#868e96', strokeWidth: 1, strokeStyle: 'dashed', startFixedPoint: [1, 0.5], endFixedPoint: [0, 0.5] }
    ),
    // Cross-domain: Architecture Concepts → SD Interview Framework (gray dashed)
    makeArrow(
      'arrow_arch_to_sd',
      'rect_synth_arch', 'rect_synth_sdframework',
      7880, 610,             // right edge arch = 6860+1020; mid-y = 610
      [[0, 0], [100, 0]],
      { strokeColor: '#868e96', strokeWidth: 1, strokeStyle: 'dashed', startFixedPoint: [1, 0.5], endFixedPoint: [0, 0.5] }
    ),
  ];

  // Post-process: register each arrow on its connected rects' boundElements
  for (const arrow of arrows) {
    const startRect = rectById.get(arrow.startBinding.elementId);
    if (startRect) startRect.boundElements.push({ id: arrow.id, type: 'arrow' });
    const endRect = rectById.get(arrow.endBinding.elementId);
    if (endRect) endRect.boundElements.push({ id: arrow.id, type: 'arrow' });
    elements.push(arrow);
  }

  return elements;
}

// ─── Collision guard ──────────────────────────────────────────────────────────

function assertNoIdCollisions(existingElements, newElements) {
  const existingIds = new Set(existingElements.map((el) => el.id));
  const collisions = newElements
    .map((el) => el.id)
    .filter((id) => existingIds.has(id));
  if (collisions.length > 0) {
    throw new Error(`ID collision detected — already in file: ${collisions.join(', ')}`);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main() {
  const args = parseArgs(process.argv);
  const analysisDir = args['analysis-dir'] ?? path.resolve(__dirname, '../.frame-analysis');
  const isDryRun = args['dry-run'];

  console.log(`\n[generate-synthesis-frame] Analysis dir: ${analysisDir}`);
  if (isDryRun) console.log('[generate-synthesis-frame] DRY RUN — no files will be written\n');

  const domainText = loadAnalysisFiles(analysisDir);
  console.log(`[generate-synthesis-frame] Loaded ${Object.keys(domainText).length} domain analyses`);
  for (const [name] of Object.entries(domainText)) {
    console.log(`  • ${name}`);
  }

  const excalidrawData = JSON.parse(fs.readFileSync(EXCALIDRAW_PATH, 'utf8'));
  const existingElements = excalidrawData.elements ?? [];

  const newElements = buildElements(domainText);
  console.log(`\n[generate-synthesis-frame] Built ${newElements.length} new elements`);

  assertNoIdCollisions(existingElements, newElements);
  console.log('[generate-synthesis-frame] No ID collisions detected ✓');

  if (isDryRun) {
    console.log('\n[generate-synthesis-frame] Dry-run element manifest:');
    console.log(JSON.stringify(newElements, null, 2));
    return;
  }

  excalidrawData.elements = [...existingElements, ...newElements];
  fs.writeFileSync(EXCALIDRAW_PATH, JSON.stringify(excalidrawData, null, 2), 'utf8');
  console.log(`[generate-synthesis-frame] Written ${newElements.length} elements to ${EXCALIDRAW_PATH}`);

  const framesJson = JSON.parse(fs.readFileSync(FRAMES_JSON_PATH, 'utf8'));
  framesJson['Senior → Staff Mastery Map'] = SYNTHESIS_FRAME_ID;
  fs.writeFileSync(FRAMES_JSON_PATH, JSON.stringify(framesJson, null, 2), 'utf8');
  console.log(`[generate-synthesis-frame] Updated ${FRAMES_JSON_PATH}\n`);
}

main();
