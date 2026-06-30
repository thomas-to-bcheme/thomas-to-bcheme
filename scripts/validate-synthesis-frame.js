#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const SYNTHESIS_FRAME_ID = 'frame_synth_mastery_map';
const EXPECTED_CHILD_COUNT = 36;

function pass(label) {
  console.log(`  \x1b[32mPASS\x1b[0m  ${label}`);
}

function fail(label, detail) {
  console.error(`  \x1b[31mFAIL\x1b[0m  ${label}: ${detail}`);
  process.exitCode = 1;
}

function main() {
  const excalidrawPath = path.resolve(
    __dirname,
    '../public/excalidraw/technical_prep.excalidraw'
  );
  const framesPath = path.resolve(
    __dirname,
    '../public/excalidraw/frames.json'
  );

  const data = JSON.parse(fs.readFileSync(excalidrawPath, 'utf8'));
  const framesJson = JSON.parse(fs.readFileSync(framesPath, 'utf8'));
  const elements = data.elements ?? [];
  const idSet = new Set(elements.map((el) => el.id));

  console.log('\nValidating synthesis frame…\n');

  // 1. Duplicate IDs
  const ids = elements.map((el) => el.id);
  const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (duplicates.length > 0) {
    fail('No duplicate element IDs', `found: ${duplicates.join(', ')}`);
  } else {
    pass('No duplicate element IDs');
  }

  // 2. Frame element exists
  const frame = elements.find(
    (el) => el.id === SYNTHESIS_FRAME_ID && el.type === 'frame'
  );
  if (!frame) {
    fail('Synthesis frame element exists', `id=${SYNTHESIS_FRAME_ID} not found`);
    return;
  }
  if (frame.frameId !== null) {
    fail('Frame element has frameId=null', `got: ${frame.frameId}`);
  } else {
    pass('Frame element exists with frameId=null');
  }

  // 3. Child count
  const children = elements.filter((el) => el.frameId === SYNTHESIS_FRAME_ID);
  if (children.length !== EXPECTED_CHILD_COUNT) {
    fail(
      `Exactly ${EXPECTED_CHILD_COUNT} child elements`,
      `found: ${children.length}`
    );
  } else {
    pass(`Exactly ${EXPECTED_CHILD_COUNT} child elements`);
  }

  // 4. No index field on synthesis children
  const withIndex = children.filter((el) => 'index' in el);
  if (withIndex.length > 0) {
    fail(
      'No synthesis child has an index field',
      `offenders: ${withIndex.map((el) => el.id).join(', ')}`
    );
  } else {
    pass('No synthesis child has an index field');
  }

  // 5. Arrow bindings resolve
  const arrows = children.filter((el) => el.type === 'arrow');
  let arrowBindingOk = true;
  for (const arrow of arrows) {
    const startId = arrow.startBinding?.elementId;
    const endId = arrow.endBinding?.elementId;
    if (startId && !idSet.has(startId)) {
      fail(`Arrow ${arrow.id} startBinding`, `elementId=${startId} not found`);
      arrowBindingOk = false;
    }
    if (endId && !idSet.has(endId)) {
      fail(`Arrow ${arrow.id} endBinding`, `elementId=${endId} not found`);
      arrowBindingOk = false;
    }
  }
  if (arrowBindingOk) pass('All arrow bindings resolve to existing element IDs');

  // 6. rect ↔ text bidirectional links
  const rects = children.filter((el) => el.type === 'rectangle');
  let linkOk = true;
  for (const rect of rects) {
    const textLinks = (rect.boundElements ?? []).filter(
      (be) => be.type === 'text'
    );
    for (const link of textLinks) {
      const textEl = elements.find((el) => el.id === link.id);
      if (!textEl) {
        fail(`Rect ${rect.id} boundElement`, `text id=${link.id} not found`);
        linkOk = false;
      } else if (textEl.containerId !== rect.id) {
        fail(
          `Text ${link.id} containerId`,
          `expected=${rect.id}, got=${textEl.containerId}`
        );
        linkOk = false;
      }
    }
  }
  if (linkOk) pass('All rect↔text boundElements/containerId links are symmetric');

  // 7. frames.json updated
  if (framesJson['Senior → Staff Mastery Map'] !== SYNTHESIS_FRAME_ID) {
    fail(
      'frames.json updated',
      `expected key "Senior → Staff Mastery Map" = "${SYNTHESIS_FRAME_ID}"`
    );
  } else {
    pass('frames.json contains "Senior → Staff Mastery Map"');
  }

  console.log(
    process.exitCode === 1
      ? '\n\x1b[31mValidation FAILED\x1b[0m\n'
      : '\n\x1b[32mValidation PASSED\x1b[0m\n'
  );
}

main();
