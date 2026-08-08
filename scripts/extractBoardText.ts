/**
 * extractBoardText.ts
 *
 * One-time content-sourcing utility for the /glossary page (see the approved
 * plan at .claude/plans/review-https-modal-com-gpu-glossary-and-parallel-unicorn.md).
 *
 * Dumps every `text` element's raw content from a set of Excalidraw boards
 * under public/excalidraw/ to scratchpad/glossary-sources/<board>.txt, grouped
 * by enclosing frame where one exists. This exists so glossary content
 * subagents draft definitions from the actual board text (Directive #3: an
 * authoritative source), never from a prose summary of it.
 *
 * Usage: npx tsx scripts/extractBoardText.ts
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

interface ExcalidrawElement {
  id: string;
  type: string;
  text?: string;
  frameId?: string | null;
  name?: string | null;
  isDeleted?: boolean;
}

interface ExcalidrawFile {
  elements: ExcalidrawElement[];
}

// Boards judged relevant per the plan's §2 category → board authority table.
// transformer-llm.excalidraw is deliberately omitted: confirmed to contain
// zero text elements (five embedded images only).
const BOARDS = [
  'design.excalidraw',
  'data.excalidraw',
  'model.excalidraw',
  'backend.excalidraw',
  'ops.excalidraw',
  'frontend.excalidraw',
  'general.excalidraw',
  'system_design_MLE.excalidraw',
  'GPU-TPU.excalidraw',
  'cuda-distributed-computing.excalidraw',
  'cuda-flash-attention.excalidraw',
  'dailydoseofds-best-practices.excalidraw',
];

const REPO_ROOT = join(__dirname, '..');
const BOARDS_DIR = join(REPO_ROOT, 'public', 'excalidraw');
const OUTPUT_DIR = join(REPO_ROOT, 'scratchpad', 'glossary-sources');

function extractBoard(boardFile: string): void {
  const boardPath = join(BOARDS_DIR, boardFile);
  const raw = readFileSync(boardPath, 'utf-8');
  const parsed: ExcalidrawFile = JSON.parse(raw);

  const elements = parsed.elements.filter((el) => !el.isDeleted);
  const frames = new Map<string, string>();
  for (const el of elements) {
    if (el.type === 'frame') {
      frames.set(el.id, el.name?.trim() || '(unnamed frame)');
    }
  }

  const textElements = elements.filter((el) => el.type === 'text' && el.text?.trim());

  // Group by frame so subagents get the same "which section is this term
  // part of" context a human reader would see on the canvas.
  const byFrame = new Map<string, ExcalidrawElement[]>();
  for (const el of textElements) {
    const frameLabel = (el.frameId && frames.get(el.frameId)) || '(no frame)';
    if (!byFrame.has(frameLabel)) byFrame.set(frameLabel, []);
    byFrame.get(frameLabel)!.push(el);
  }

  const lines: string[] = [
    `# Source: public/excalidraw/${boardFile}`,
    `# Text elements: ${textElements.length}`,
    '',
  ];
  for (const [frameLabel, els] of byFrame) {
    lines.push(`## Frame: ${frameLabel}`, '');
    for (const el of els) {
      lines.push(el.text!.trim(), '---');
    }
    lines.push('');
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });
  const outPath = join(OUTPUT_DIR, boardFile.replace(/\.excalidraw$/, '.txt'));
  writeFileSync(outPath, lines.join('\n'), 'utf-8');
  console.log(`level=INFO board=${boardFile} text_elements=${textElements.length} out=${outPath}`);
}

function main(): void {
  for (const board of BOARDS) {
    try {
      extractBoard(board);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`level=ERROR board=${board} error="${message}"`);
    }
  }
}

main();
