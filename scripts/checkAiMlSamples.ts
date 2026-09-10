/**
 * checkAiMlSamples.ts
 *
 * Compiles (syntax-checks) every code sample in the /ai-ml registry.
 *
 * OPTIONAL, and deliberately not a phase gate. These samples are reference
 * material -- they exist so a reader can compare how the same algorithm is
 * expressed in three languages, not to be linked and run. They are fragments
 * with no main and no crate scaffolding, so "does it compile" is the wrong bar
 * for most of them.
 *
 * What this is still useful for: catching outright typos in the samples that a
 * toolchain happens to be installed for. Run it when you want that signal;
 * verify:ai-ml is the actual gate.
 *
 * Deliberately syntax-only, and skips rather than fails when a toolchain or a
 * third-party header/crate is absent.
 *
 * Usage:
 *   npx tsx scripts/checkAiMlSamples.ts [--language python|cpp|rust] [--model <slug>]
 */

import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { AI_ML_MODELS } from '../src/constants/aiMl';
import { AI_ML_LANGUAGES, AI_ML_STAGES, type CodeLanguageId } from '../src/constants/aiMl/types';

type Level = 'INFO' | 'WARN' | 'ERROR';

function log(level: Level, message: string, context: Record<string, unknown> = {}): void {
  const contextStr = Object.entries(context)
    .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
    .join(' ');
  console[level === 'ERROR' ? 'error' : 'log'](`level=${level} ${contextStr} msg="${message}"`);
}

function hasCommand(command: string): boolean {
  return spawnSync('which', [command], { stdio: 'ignore' }).status === 0;
}

/**
 * A sample that includes a third-party header or crate cannot be syntax-checked
 * without that dependency installed. Reporting it as a failure would punish a
 * machine for not having Eigen; reporting it as skipped is honest.
 */
const EXTERNAL_DEPENDENCY = /#include <Eigen|#include <torch|use rayon|use ndarray|use linfa|use candle/;

interface Outcome {
  checked: number;
  skipped: number;
  failures: string[];
}

const CHECKERS: Record<
  CodeLanguageId,
  { command: string; args: (file: string) => string[]; extension: string }
> = {
  python: { command: 'python3', args: (file) => ['-m', 'py_compile', file], extension: 'py' },
  cpp: {
    command: 'g++',
    args: (file) => ['-fsyntax-only', '-std=c++20', file],
    extension: 'cpp',
  },
  rust: {
    command: 'rustc',
    args: (file) => ['--edition', '2021', '--crate-type', 'lib', '--emit=metadata', '-o', '/dev/null', file],
    extension: 'rs',
  },
};

function main(): void {
  const args = process.argv.slice(2);
  const languageArg = args.includes('--language')
    ? (args[args.indexOf('--language') + 1] as CodeLanguageId)
    : null;
  const modelArg = args.includes('--model') ? args[args.indexOf('--model') + 1] : null;

  const models = modelArg ? AI_ML_MODELS.filter((m) => m.slug === modelArg) : AI_ML_MODELS;
  if (modelArg && models.length === 0) {
    log('ERROR', `no model with slug "${modelArg}"`);
    process.exit(1);
  }

  const languages = AI_ML_LANGUAGES.filter((l) => !languageArg || l.id === languageArg);
  const workDir = mkdtempSync(join(tmpdir(), 'ai-ml-samples-'));
  const outcome: Outcome = { checked: 0, skipped: 0, failures: [] };

  try {
    for (const language of languages) {
      const checker = CHECKERS[language.id];
      if (!hasCommand(checker.command)) {
        log('WARN', `${checker.command} not found — skipping all ${language.label} samples`);
        outcome.skipped += models.length * AI_ML_STAGES.length;
        continue;
      }

      for (const model of models) {
        for (const stage of AI_ML_STAGES) {
          const sample = model.implementations[language.id]?.[stage.id];
          if (!sample) continue;

          if (EXTERNAL_DEPENDENCY.test(sample.code)) {
            outcome.skipped += 1;
            log('WARN', 'skipped: needs a third-party dependency to check', {
              model: model.slug,
              language: language.id,
              stage: stage.id,
            });
            continue;
          }

          const file = join(workDir, `${model.slug}-${language.id}-${stage.id}.${checker.extension}`);
          writeFileSync(file, sample.code, 'utf-8');

          try {
            execFileSync(checker.command, checker.args(file), { stdio: 'pipe' });
            outcome.checked += 1;
          } catch (error) {
            const stderr =
              error && typeof error === 'object' && 'stderr' in error
                ? String((error as { stderr: Buffer }).stderr).slice(0, 600)
                : String(error);
            outcome.failures.push(
              `${model.slug} / ${language.label} / ${stage.label}\n${stderr}`,
            );
          }
        }
      }
    }
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }

  for (const failure of outcome.failures) log('ERROR', failure);

  if (outcome.failures.length > 0) {
    log('ERROR', 'sample compilation failed', {
      failure_count: outcome.failures.length,
      checked: outcome.checked,
      skipped: outcome.skipped,
    });
    process.exit(1);
  }

  log('INFO', 'sample compilation passed', {
    checked: outcome.checked,
    skipped: outcome.skipped,
  });
  process.exit(0);
}

main();
