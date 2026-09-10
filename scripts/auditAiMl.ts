/**
 * auditAiMl.ts — progress report and work dispatcher for the /ai-ml build.
 *
 * This is what makes the content build resumable across sessions that share no
 * context. It diffs the canonical backlog (src/constants/aiMl/backlog.ts)
 * against what is actually registered, and emits the next unauthored entry in
 * work order — so a cold session can ask the repository what to do rather than
 * being told.
 *
 * Usage:
 *   npx tsx scripts/auditAiMl.ts            full progress report
 *   npx tsx scripts/auditAiMl.ts --next     just the next entry to author
 *   npx tsx scripts/auditAiMl.ts --next 5   the next 5, for batch planning
 *   npx tsx scripts/auditAiMl.ts --json     machine-readable state
 *
 * Exit codes: 0 while work remains or all is complete, 1 only on a real
 * integrity problem (an authored model absent from the backlog).
 */

import { AI_ML_MODELS, AI_ML_CATEGORIES } from '../src/constants/aiMl';
import { AI_ML_BACKLOG, type BacklogEntry } from '../src/constants/aiMl/backlog';
import { AI_ML_LANGUAGES, AI_ML_STAGES } from '../src/constants/aiMl/types';

const authored = new Set(AI_ML_MODELS.map((m) => m.slug));
const remaining: BacklogEntry[] = AI_ML_BACKLOG.filter((e) => !authored.has(e.slug));
const orphans = AI_ML_MODELS.filter(
  (m) => !AI_ML_BACKLOG.some((e) => e.slug === m.slug),
);

function sampleCoverage(): { present: number; missing: string[] } {
  const missing: string[] = [];
  let present = 0;
  for (const model of AI_ML_MODELS) {
    for (const language of AI_ML_LANGUAGES) {
      for (const stage of AI_ML_STAGES) {
        const sample = model.implementations[language.id]?.[stage.id];
        if (!sample || !sample.code.trim()) {
          missing.push(`${model.slug} ${language.id}/${stage.id}`);
        } else {
          present += 1;
        }
      }
    }
  }
  return { present, missing };
}

function printNext(count: number): void {
  if (remaining.length === 0) {
    console.log('BACKLOG COMPLETE — no models left to author.');
    return;
  }
  for (const entry of remaining.slice(0, count)) {
    console.log(
      `${entry.slug}\t${entry.category}\t${entry.group}\t${entry.name}\t` +
        `src/constants/aiMl/models/${entry.category}/${entry.slug}.ts`,
    );
  }
}

function printReport(): void {
  const { present, missing } = sampleCoverage();
  const expected = AI_ML_MODELS.length * AI_ML_LANGUAGES.length * AI_ML_STAGES.length;

  console.log('=== /ai-ml build status ===\n');
  console.log(
    `Models:       ${AI_ML_MODELS.length} / ${AI_ML_BACKLOG.length} authored ` +
      `(${Math.round((AI_ML_MODELS.length / AI_ML_BACKLOG.length) * 100)}%)`,
  );
  console.log(`Code samples: ${present} / ${expected} present` +
    (missing.length ? `  — ${missing.length} MISSING` : '  — complete for authored models'));
  for (const gap of missing) console.log(`    MISSING ${gap}`);

  console.log('\nPer category:');
  for (const category of AI_ML_CATEGORIES) {
    const done = AI_ML_MODELS.filter((m) => m.category === category.id).length;
    const total = AI_ML_BACKLOG.filter((e) => e.category === category.id).length;
    const bar = '#'.repeat(Math.round((done / total) * 20)).padEnd(20, '.');
    console.log(`  ${bar}  ${String(done).padStart(2)} / ${total}  ${category.label}`);
  }

  if (orphans.length > 0) {
    console.log('\nINTEGRITY: authored models absent from the backlog:');
    for (const orphan of orphans) console.log(`    ${orphan.slug}`);
  }

  console.log(`\nRemaining: ${remaining.length}`);
  if (remaining.length > 0) {
    console.log('\nNext up (work order):');
    for (const entry of remaining.slice(0, 5)) {
      console.log(`  ${entry.slug.padEnd(32)} ${entry.category}/${entry.group}`);
    }
  }
}

function main(): void {
  const args = process.argv.slice(2);

  if (args.includes('--json')) {
    const { present, missing } = sampleCoverage();
    console.log(
      JSON.stringify(
        {
          authored: AI_ML_MODELS.length,
          total: AI_ML_BACKLOG.length,
          remaining: remaining.length,
          samplesPresent: present,
          samplesMissing: missing,
          next: remaining[0] ?? null,
          orphans: orphans.map((o) => o.slug),
        },
        null,
        2,
      ),
    );
  } else if (args.includes('--next')) {
    const index = args.indexOf('--next');
    const count = Number.parseInt(args[index + 1] ?? '1', 10) || 1;
    printNext(count);
  } else {
    printReport();
  }

  // An authored model missing from the backlog means the ledger and the
  // registry have diverged — that is a real integrity failure, not progress.
  process.exit(orphans.length > 0 ? 1 : 0);
}

main();
