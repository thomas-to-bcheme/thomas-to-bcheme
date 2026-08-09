/**
 * verifyGlossary.ts
 *
 * Data-integrity gate for the /glossary content pipeline (plan §8). Runs as
 * a standalone script — not a module-scope throw inside src/constants/glossary
 * — because that module is imported by a 'use client' component and a throw
 * there would ship into the browser bundle and re-fire on every hydration,
 * plus it would be permanently blind to the pipeline's most likely failure
 * (an overwritten/empty definition), since Phase 1's own build gate requires
 * the structural check to pass *with* empty definitions.
 *
 * Usage:
 *   npx tsx scripts/verifyGlossary.ts --structural   (from Phase 1 onward)
 *   npx tsx scripts/verifyGlossary.ts --complete      (Phase 3 only)
 *
 * Exit 0 on success, non-zero on hard failure (per CLAUDE.md §5 Operational
 * Standards). Idempotent: --structural only writes the ledger snapshot if
 * one doesn't already exist, so re-running it is safe.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { GLOSSARY_CATEGORIES, GLOSSARY_TERMS, MIN_TERMS_PER_CATEGORY, getTermsByCategory } from '../src/constants/glossary';

const REPO_ROOT = join(__dirname, '..');
const SNAPSHOT_PATH = join(REPO_ROOT, 'scratchpad', 'glossary-sources', 'ledger-snapshot.json');

interface LedgerSnapshotEntry {
  slug: string;
  term: string;
  category: string;
}

function log(level: 'INFO' | 'WARN' | 'ERROR', message: string, context: Record<string, unknown> = {}): void {
  const contextStr = Object.entries(context)
    .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
    .join(' ');
  console[level === 'ERROR' ? 'error' : 'log'](`level=${level} ${contextStr} msg="${message}"`);
}

/** Checks that hold at every phase, including with empty definitions. */
function runStructuralChecks(): string[] {
  const failures: string[] = [];
  const validCategoryIds = new Set(GLOSSARY_CATEGORIES.map((c) => c.id));

  const slugCounts = new Map<string, number>();
  const termNameCounts = new Map<string, number>();
  for (const t of GLOSSARY_TERMS) {
    slugCounts.set(t.slug, (slugCounts.get(t.slug) ?? 0) + 1);
    const normalizedTerm = t.term.toLowerCase();
    termNameCounts.set(normalizedTerm, (termNameCounts.get(normalizedTerm) ?? 0) + 1);
  }
  for (const [slug, count] of slugCounts) {
    if (count > 1) failures.push(`duplicate slug "${slug}" (${count} occurrences)`);
  }
  for (const [term, count] of termNameCounts) {
    if (count > 1) failures.push(`duplicate term name "${term}" (${count} occurrences, case-insensitive)`);
  }

  const allSlugs = new Set(GLOSSARY_TERMS.map((t) => t.slug));
  for (const t of GLOSSARY_TERMS) {
    if (!validCategoryIds.has(t.category)) {
      failures.push(`term "${t.slug}" has invalid category "${t.category}"`);
    }
    for (const related of t.relatedSlugs ?? []) {
      if (!allSlugs.has(related)) {
        failures.push(`term "${t.slug}" has unresolved relatedSlugs entry "${related}"`);
      }
    }
  }

  return failures;
}

/** Checks that only hold once Phase 2/3 content authoring is complete. */
function runCompleteChecks(): { failures: string[]; warnings: string[] } {
  const failures: string[] = [];
  const warnings: string[] = [];
  const MIN_DEFINITION_LENGTH = 20;

  for (const t of GLOSSARY_TERMS) {
    if (!t.definition.trim()) {
      failures.push(`term "${t.slug}" has an empty definition`);
    } else if (t.definition.trim().length < MIN_DEFINITION_LENGTH) {
      failures.push(`term "${t.slug}" definition is shorter than ${MIN_DEFINITION_LENGTH} chars`);
    }
  }

  for (const category of GLOSSARY_CATEGORIES) {
    const count = getTermsByCategory(category.id).length;
    if (count < MIN_TERMS_PER_CATEGORY) {
      warnings.push(`category "${category.id}" has only ${count} terms (floor: ${MIN_TERMS_PER_CATEGORY}) — consider merging into a sibling`);
    }
  }

  if (existsSync(SNAPSHOT_PATH)) {
    const snapshot: LedgerSnapshotEntry[] = JSON.parse(readFileSync(SNAPSHOT_PATH, 'utf-8'));
    const snapshotSlugs = new Set(snapshot.map((e) => e.slug));
    const currentSlugs = new Set(GLOSSARY_TERMS.map((t) => t.slug));
    for (const slug of snapshotSlugs) {
      if (!currentSlugs.has(slug)) failures.push(`term "${slug}" was in the Phase 1 ledger but is now missing`);
    }
    for (const slug of currentSlugs) {
      if (!snapshotSlugs.has(slug)) failures.push(`term "${slug}" was added after the Phase 1 ledger snapshot — not in scope for a content subagent to add`);
    }
  } else {
    warnings.push(`no ledger snapshot found at ${SNAPSHOT_PATH} — run --structural first to create one`);
  }

  return { failures, warnings };
}

function writeSnapshotIfAbsent(): void {
  if (existsSync(SNAPSHOT_PATH)) {
    log('INFO', 'ledger snapshot already exists, leaving it untouched', { path: SNAPSHOT_PATH });
    return;
  }
  const snapshot: LedgerSnapshotEntry[] = GLOSSARY_TERMS.map((t) => ({ slug: t.slug, term: t.term, category: t.category })).sort(
    (a, b) => a.slug.localeCompare(b.slug)
  );
  mkdirSync(join(REPO_ROOT, 'scratchpad', 'glossary-sources'), { recursive: true });
  writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2), 'utf-8');
  log('INFO', 'wrote ledger snapshot', { path: SNAPSHOT_PATH, term_count: snapshot.length });
}

function main(): void {
  const mode = process.argv.includes('--complete') ? 'complete' : process.argv.includes('--structural') ? 'structural' : null;
  if (!mode) {
    log('ERROR', 'missing required flag: pass --structural or --complete');
    process.exit(1);
  }

  const structuralFailures = runStructuralChecks();
  for (const f of structuralFailures) log('ERROR', f);

  if (mode === 'structural') {
    if (structuralFailures.length > 0) {
      log('ERROR', 'structural verification failed', { failure_count: structuralFailures.length });
      process.exit(1);
    }
    writeSnapshotIfAbsent();
    log('INFO', 'structural verification passed', { term_count: GLOSSARY_TERMS.length, category_count: GLOSSARY_CATEGORIES.length });
    process.exit(0);
  }

  // --complete
  const { failures: completeFailures, warnings } = runCompleteChecks();
  for (const w of warnings) log('WARN', w);
  const allFailures = [...structuralFailures, ...completeFailures];
  for (const f of completeFailures) log('ERROR', f);

  if (allFailures.length > 0) {
    log('ERROR', 'complete verification failed', { failure_count: allFailures.length });
    process.exit(1);
  }
  log('INFO', 'complete verification passed', { term_count: GLOSSARY_TERMS.length, category_count: GLOSSARY_CATEGORIES.length });
  process.exit(0);
}

main();
