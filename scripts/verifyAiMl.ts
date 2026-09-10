/**
 * verifyAiMl.ts
 *
 * Data-integrity gate for the /ai-ml content pipeline. Modelled directly on
 * scripts/verifyGlossary.ts, and a standalone script for the same two reasons:
 * a module-scope throw would ship into any client bundle that imported the
 * registry, and the gate must be able to PASS while categories are deliberately
 * empty during the content phases.
 *
 * Usage:
 *   npx tsx scripts/verifyAiMl.ts --structural   (every phase)
 *   npx tsx scripts/verifyAiMl.ts --complete     (once content has landed)
 *
 * Exit 0 on success, non-zero on hard failure (CLAUDE.md §5). Idempotent:
 * --structural only writes the ledger snapshot if one does not already exist.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import katex from 'katex';

import {
  AI_ML_CATEGORIES,
  AI_ML_MODELS,
  APPLIED_DOMAINS,
  getCategoryById,
  getModelBySlug,
  getModelsByCategory,
} from '../src/constants/aiMl';
import { LANGUAGE_STANDARDS } from '../src/constants/aiMl/languageStandards';
import { DECISION_TREE } from '../src/constants/aiMl/decisionTree';
import { OPERATIONAL_GOALS } from '../src/constants/aiMl/operationalGoals';
import {
  AI_ML_LANGUAGES,
  AI_ML_STAGES,
  MIN_MODELS_PER_CATEGORY,
  type AiMlModel,
  type CodeLanguageId,
} from '../src/constants/aiMl/types';

const REPO_ROOT = join(__dirname, '..');
const MODELS_DIR = join(REPO_ROOT, 'src', 'constants', 'aiMl', 'models');
const SRC_DIR = join(REPO_ROOT, 'src');
const SNAPSHOT_PATH = join(REPO_ROOT, 'scratchpad', 'ai-ml-sources', 'ledger-snapshot.json');

const FEATURED_DOMAIN_IDS = [
  'time-series-forecasting',
  'anomaly-detection',
  'optimization',
] as const;

const KEBAB_CASE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** ML imports that disqualify a 'make-it-work' (from-scratch) sample. */
const ML_IMPORT_PATTERN =
  /import numpy|import torch|from sklearn|from scipy|#include <torch|#include <Eigen|use ndarray|use candle|use linfa|use rayon/;

interface LedgerEntry {
  slug: string;
  name: string;
  category: string;
}

type Level = 'INFO' | 'WARN' | 'ERROR';

function log(level: Level, message: string, context: Record<string, unknown> = {}): void {
  const contextStr = Object.entries(context)
    .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
    .join(' ');
  console[level === 'ERROR' ? 'error' : 'log'](
    `level=${level} ${contextStr} msg="${message}"`,
  );
}

// ---------------------------------------------------------------------------
// Structural checks — hold at every phase, including with empty categories
// ---------------------------------------------------------------------------

function checkIdentity(failures: string[], warnings: string[]): void {
  const slugCounts = new Map<string, number>();
  for (const model of AI_ML_MODELS) {
    slugCounts.set(model.slug, (slugCounts.get(model.slug) ?? 0) + 1);
  }
  for (const [slug, count] of slugCounts) {
    if (count > 1) failures.push(`duplicate slug "${slug}" (${count} occurrences)`);
  }

  for (const model of AI_ML_MODELS) {
    if (!KEBAB_CASE.test(model.slug)) {
      failures.push(`slug "${model.slug}" is not kebab-case`);
    }

    const category = getCategoryById(model.category);
    if (!category) {
      failures.push(`model "${model.slug}" has unknown category "${model.category}"`);
      continue;
    }
    if (!category.groups.some((group) => group.id === model.group)) {
      failures.push(
        `model "${model.slug}" has group "${model.group}", which is not a group of "${model.category}"`,
      );
    }

    // filename == slug
    const expectedPath = join(MODELS_DIR, model.category, `${model.slug}.ts`);
    if (!existsSync(expectedPath)) {
      failures.push(`model "${model.slug}" has no file at models/${model.category}/${model.slug}.ts`);
    }

    for (const related of model.relatedSlugs) {
      if (related === model.slug) {
        failures.push(`model "${model.slug}" lists itself in relatedSlugs`);
      } else if (!getModelBySlug(related)) {
        // Expected while content is still landing; hard-fails under --complete.
        warnings.push(`model "${model.slug}" relatedSlugs entry "${related}" does not resolve yet`);
      } else if (!getModelBySlug(related)!.relatedSlugs.includes(model.slug)) {
        warnings.push(`relatedSlugs is not reciprocal: "${model.slug}" -> "${related}"`);
      }
    }
  }

  if (AI_ML_CATEGORIES.some((category) => category.id === ('applied' as string))) {
    failures.push(`"applied" is a reserved route segment and cannot be a category id`);
  }
}

function checkClassificationAxes(failures: string[]): void {
  for (const model of AI_ML_MODELS) {
    if (model.kind === 'model') {
      if (model.paradigms.length === 0) {
        failures.push(`model "${model.slug}" has kind 'model' but no learning paradigm`);
      }
      if (model.taskTypes.length === 0) {
        failures.push(`model "${model.slug}" has kind 'model' but no task type`);
      }
    }

    if (new Set(model.paradigms).size !== model.paradigms.length) {
      failures.push(`model "${model.slug}" repeats a paradigm`);
    }
    if (new Set(model.taskTypes).size !== model.taskTypes.length) {
      failures.push(`model "${model.slug}" repeats a task type`);
    }

    const isDeep = model.category === 'deep-learning';
    if (isDeep && !model.architecture) {
      failures.push(`deep-learning model "${model.slug}" is missing an architecture`);
    }
    if (!isDeep && model.architecture) {
      failures.push(
        `model "${model.slug}" declares an architecture but is not a deep-learning entry`,
      );
    }

    // Cross-axis consistency: claiming an anomaly-detection fit must be
    // reflected in the task types, or the two classifications drift apart.
    const anomalyFit = model.applications.featured['anomaly-detection'].fit;
    if (anomalyFit !== 'not-applicable' && !model.taskTypes.includes('anomaly-detection')) {
      failures.push(
        `model "${model.slug}" rates anomaly-detection as "${anomalyFit}" but does not list it as a task type`,
      );
    }
  }
}

function checkAppliedDomains(failures: string[], warnings: string[]): void {
  const categoryIds = AI_ML_CATEGORIES.map((category) => category.id);

  for (const domain of APPLIED_DOMAINS) {
    const shouldBeFeatured = (FEATURED_DOMAIN_IDS as readonly string[]).includes(domain.id);
    if (domain.featured !== shouldBeFeatured) {
      failures.push(`domain "${domain.id}" has featured=${domain.featured}, expected ${shouldBeFeatured}`);
    }

    for (const categoryId of categoryIds) {
      const fit = domain.categoryFit[categoryId];
      if (!fit) {
        failures.push(`domain "${domain.id}" is missing a verdict for category "${categoryId}"`);
        continue;
      }
      if (!fit.why.trim()) {
        failures.push(`domain "${domain.id}" verdict for "${categoryId}" has an empty why`);
      }
      for (const slug of fit.representativeSlugs) {
        const model = getModelBySlug(slug);
        if (!model) {
          warnings.push(`domain "${domain.id}" representative slug "${slug}" does not resolve yet`);
          continue;
        }
        const profile =
          (FEATURED_DOMAIN_IDS as readonly string[]).includes(domain.id)
            ? model.applications.featured[domain.id as (typeof FEATURED_DOMAIN_IDS)[number]]
            : model.applications.breadth[domain.id as keyof typeof model.applications.breadth];
        if (!profile || profile.fit === 'not-applicable') {
          failures.push(
            `domain "${domain.id}" recommends "${slug}", but that model rates the domain not-applicable`,
          );
        }
      }
    }
  }

  for (const model of AI_ML_MODELS) {
    for (const domainId of FEATURED_DOMAIN_IDS) {
      if (!model.applications.featured[domainId]) {
        failures.push(`model "${model.slug}" is missing featured domain "${domainId}"`);
      }
    }
  }
}

function checkDecisionTree(failures: string[], warnings: string[]): void {
  const byId = new Map(DECISION_TREE.map((node) => [node.id, node]));
  if (byId.size !== DECISION_TREE.length) {
    failures.push('decision tree has duplicate node ids');
  }

  const roots = DECISION_TREE.filter((node) => node.parentId === null);
  if (roots.length !== 1) {
    failures.push(`decision tree must have exactly one root, found ${roots.length}`);
  }
  if (roots[0] && roots[0].level !== 0) {
    failures.push(`decision tree root "${roots[0].id}" must be at level 0`);
  }
  for (const node of DECISION_TREE) {
    if (node.parentId === null && node.id !== roots[0]?.id) {
      failures.push(`decision tree node "${node.id}" is a second root`);
    }
  }

  for (const node of DECISION_TREE) {
    if (!node.question.trim() || !node.rationale.trim()) {
      failures.push(`decision tree node "${node.id}" has an empty question or rationale`);
    }
    if (node.parentId !== null && !node.edgeLabel) {
      failures.push(`decision tree node "${node.id}" has no edgeLabel`);
    }

    if (node.parentId !== null) {
      const parent = byId.get(node.parentId);
      if (!parent) {
        failures.push(`decision tree node "${node.id}" has unknown parentId "${node.parentId}"`);
        continue;
      }
      if (node.level !== parent.level + 1) {
        failures.push(
          `decision tree node "${node.id}" is level ${node.level} under a level ${parent.level} parent — levels must ascend by one`,
        );
      }

      // Bounded walk to root; a cycle would otherwise hang the renderer.
      const seen = new Set<string>([node.id]);
      let cursor = parent;
      let hops = 0;
      while (cursor.parentId !== null && hops < DECISION_TREE.length + 1) {
        if (seen.has(cursor.id)) {
          failures.push(`decision tree has a cycle through "${node.id}"`);
          break;
        }
        seen.add(cursor.id);
        const next = byId.get(cursor.parentId);
        if (!next) break;
        cursor = next;
        hops += 1;
      }
      if (hops >= DECISION_TREE.length + 1) {
        failures.push(`decision tree walk from "${node.id}" did not terminate`);
      }
    }

    if (node.target) {
      const { kind, id } = node.target;
      if (kind === 'category' && !getCategoryById(id)) {
        failures.push(`decision tree node "${node.id}" targets unknown category "${id}"`);
      }
      if (kind === 'domain' && !APPLIED_DOMAINS.some((domain) => domain.id === id)) {
        failures.push(`decision tree node "${node.id}" targets unknown domain "${id}"`);
      }
      if (kind === 'group') {
        const [categoryId, groupId] = id.split('/');
        const category = getCategoryById(categoryId ?? '');
        if (!category || !category.groups.some((group) => group.id === groupId)) {
          failures.push(`decision tree node "${node.id}" targets unknown group "${id}"`);
        }
      }
      if (kind === 'model' && !getModelBySlug(id)) {
        warnings.push(`decision tree node "${node.id}" targets model "${id}", which does not exist yet`);
      }
    }
  }

  // The hub is supposed to be able to reach everything general.
  const targeted = new Set(DECISION_TREE.filter((n) => n.target).map((n) => n.target!.id));
  for (const category of AI_ML_CATEGORIES) {
    const reached =
      targeted.has(category.id) ||
      [...targeted].some((id) => typeof id === 'string' && id.startsWith(`${category.id}/`));
    if (!reached) {
      warnings.push(`category "${category.id}" is unreachable from the decision tree`);
    }
  }
  for (const domainId of FEATURED_DOMAIN_IDS) {
    if (!targeted.has(domainId)) {
      warnings.push(`featured domain "${domainId}" is unreachable from the decision tree`);
    }
  }
}

/**
 * The operational-goal table sits one level above the applied domains and joins
 * to them by id. Without this check it would silently become an orphan chart
 * the moment a domain is renamed.
 */
function checkOperationalGoals(failures: string[]): void {
  const seen = new Set<string>();
  for (const goal of OPERATIONAL_GOALS) {
    if (seen.has(goal.id)) failures.push(`duplicate operational goal id "${goal.id}"`);
    seen.add(goal.id);

    if (!KEBAB_CASE.test(goal.id)) {
      failures.push(`operational goal id "${goal.id}" is not kebab-case`);
    }
    if (goal.appliedTopics.length === 0) {
      failures.push(`operational goal "${goal.id}" lists no applied topics`);
    }
    if (goal.implementation.length === 0) {
      failures.push(`operational goal "${goal.id}" lists no implementation tools`);
    }
    if (!goal.rationaleLead.trim() || !goal.rationale.trim()) {
      failures.push(`operational goal "${goal.id}" has an empty rationale`);
    }
    if (goal.relatedDomainIds.length === 0) {
      failures.push(`operational goal "${goal.id}" links to no applied domain`);
    }
    for (const domainId of goal.relatedDomainIds) {
      if (!APPLIED_DOMAINS.some((domain) => domain.id === domainId)) {
        failures.push(`operational goal "${goal.id}" links to unknown domain "${domainId}"`);
      }
    }
    if (goal.rationaleMath) {
      const error = renderKatex(goal.rationaleMath);
      if (error) {
        failures.push(`operational goal "${goal.id}" rationaleMath does not render: ${error}`);
      }
    }
  }

  // Every domain should be reachable from at least one goal, or the taxonomy
  // is not actually covering the site.
  const linked = new Set(OPERATIONAL_GOALS.flatMap((goal) => goal.relatedDomainIds));
  for (const domain of APPLIED_DOMAINS) {
    if (!linked.has(domain.id)) {
      failures.push(`applied domain "${domain.id}" is not reachable from any operational goal`);
    }
  }
}

function checkOrderingMetadata(failures: string[]): void {
  for (const category of AI_ML_CATEGORIES) {
    if (!category.premise.trim()) {
      failures.push(`category "${category.id}" has an empty premise`);
    }
    for (const group of category.groups) {
      if (!group.abstraction.trim()) {
        failures.push(`group "${category.id}/${group.id}" has an empty abstraction`);
      }
    }
  }
}

function checkImplementationShape(failures: string[], warnings: string[]): void {
  for (const model of AI_ML_MODELS) {
    for (const language of AI_ML_LANGUAGES) {
      const standard = LANGUAGE_STANDARDS[language.id];
      const stages = model.implementations[language.id];
      if (!stages) {
        failures.push(`model "${model.slug}" is missing all ${language.label} samples`);
        continue;
      }

      const codeByStage: string[] = [];
      for (const stage of AI_ML_STAGES) {
        const sample = stages[stage.id];
        if (!sample) {
          failures.push(`model "${model.slug}" is missing ${language.label} / ${stage.label}`);
          continue;
        }
        codeByStage.push(sample.code);

        if (stage.id === 'make-it-work') {
          if (sample.rationale) {
            failures.push(
              `model "${model.slug}" ${language.label} / ${stage.label} has a rationale, but it has no predecessor to compare against`,
            );
          }
          if (ML_IMPORT_PATTERN.test(sample.code)) {
            failures.push(
              `model "${model.slug}" ${language.label} / ${stage.label} imports an ML library — the from-scratch stage must not`,
            );
          }
        } else if (!sample.rationale?.trim()) {
          failures.push(
            `model "${model.slug}" ${language.label} / ${stage.label} has no rationale saying what changed`,
          );
        }

        if (stage.id === 'make-it-right') {
          if (!sample.conventions?.length) {
            failures.push(
              `model "${model.slug}" ${language.label} / ${stage.label} lists no conventions`,
            );
          }
          for (const convention of sample.conventions ?? []) {
            if (!standard.conventions.includes(convention)) {
              failures.push(
                `model "${model.slug}" ${language.label} convention "${convention}" is not in LANGUAGE_STANDARDS.${language.id}.conventions`,
              );
            }
          }
        }

        if (stage.id === 'make-it-fast') {
          if (!sample.optimizations?.length) {
            failures.push(
              `model "${model.slug}" ${language.label} / ${stage.label} claims to be optimized but lists no optimizations`,
            );
          }
          for (const optimization of sample.optimizations ?? []) {
            if (!standard.optimizationLevers.includes(optimization.technique)) {
              failures.push(
                `model "${model.slug}" ${language.label} optimization "${optimization.technique}" is not in LANGUAGE_STANDARDS.${language.id}.optimizationLevers`,
              );
            }
            if (!optimization.tradeoff.trim()) {
              failures.push(
                `model "${model.slug}" ${language.label} optimization "${optimization.technique}" has no trade-off`,
              );
            }
            if (standard.antiPatterns.includes(optimization.technique)) {
              warnings.push(
                `model "${model.slug}" ${language.label} optimization "${optimization.technique}" is listed as an anti-pattern`,
              );
            }
          }
        }
      }

      // Three identical stages means the progression was padded.
      for (let i = 0; i < codeByStage.length; i += 1) {
        for (let j = i + 1; j < codeByStage.length; j += 1) {
          if (codeByStage[i].trim() === codeByStage[j].trim()) {
            failures.push(
              `model "${model.slug}" ${language.label} stages ${i + 1} and ${j + 1} are identical — the progression does not progress`,
            );
          }
        }
      }
    }
  }
}

/**
 * The one mistake that would blow up the client bundle: a 'use client' file
 * importing the registry drags every model's code strings into the browser.
 * Types-only imports are fine, which is why the display-order constants live in
 * types.ts.
 */
function checkBundleSafety(failures: string[]): void {
  const offenders: string[] = [];

  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) {
        walk(path);
        continue;
      }
      if (!/\.(ts|tsx)$/.test(entry)) continue;

      const source = readFileSync(path, 'utf-8');
      if (!/^\s*['"]use client['"]/m.test(source)) continue;
      if (/from '@\/constants\/aiMl'|from '@\/constants\/aiMl\/(?!types)/.test(source)) {
        offenders.push(path.replace(`${REPO_ROOT}/`, ''));
      }
    }
  };

  walk(SRC_DIR);
  for (const offender of offenders) {
    failures.push(
      `'use client' file ${offender} imports the aiMl registry — import @/constants/aiMl/types instead and take model data as props`,
    );
  }
}

// ---------------------------------------------------------------------------
// Complete checks — only once a category's content has landed
// ---------------------------------------------------------------------------

const MIN_INTUITION = 40;
const MIN_CODE = 60;

function renderKatex(formula: string): string | null {
  try {
    katex.renderToString(formula, { displayMode: true, throwOnError: true });
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

function checkModelContent(model: AiMlModel, failures: string[]): void {
  if (model.intuition.trim().length < MIN_INTUITION) {
    failures.push(`model "${model.slug}" intuition is shorter than ${MIN_INTUITION} chars`);
  }

  for (const [label, expression] of [
    ['objective', model.objective.expression],
    ['optimization update rule', model.optimization.updateRule],
  ] as const) {
    if (!expression.formula.trim()) {
      failures.push(`model "${model.slug}" has an empty ${label} formula`);
      continue;
    }
    const error = renderKatex(expression.formula);
    if (error) {
      failures.push(`model "${model.slug}" ${label} formula does not render: ${error}`);
    }
    if (expression.symbols.length === 0) {
      failures.push(`model "${model.slug}" ${label} defines no symbols`);
    }
  }

  if (!model.optimization.convergence.trim() || !model.optimization.complexity.trim()) {
    failures.push(`model "${model.slug}" is missing convergence or complexity notes`);
  }

  for (const [field, entries] of [
    ['assumptions', model.assumptions],
    ['pros', model.pros],
    ['cons', model.cons],
  ] as const) {
    if (entries.length < 2) {
      failures.push(`model "${model.slug}" has fewer than 2 ${field}`);
    }
  }
  for (const point of [...model.pros, ...model.cons]) {
    if (!point.context.trim()) {
      failures.push(`model "${model.slug}" trade-off "${point.point}" has no context`);
    }
  }

  for (const domainId of FEATURED_DOMAIN_IDS) {
    const profile = model.applications.featured[domainId];
    if (profile.fit === 'not-applicable') {
      if (!profile.why.trim()) {
        failures.push(`model "${model.slug}" ${domainId} is not-applicable with no explanation`);
      }
      continue;
    }
    if (!profile.how.trim() || !profile.why.trim() || !profile.evaluation.trim()) {
      failures.push(`model "${model.slug}" ${domainId} profile is missing how/why/evaluation`);
    }
    if (profile.where.length === 0) {
      failures.push(`model "${model.slug}" ${domainId} profile names no real use case`);
    }
  }

  if (
    !model.deployment.trainingCost.trim() ||
    !model.deployment.inferenceProfile.trim() ||
    !model.deployment.retrainingCadence.trim()
  ) {
    failures.push(`model "${model.slug}" has incomplete deployment notes`);
  }

  for (const language of AI_ML_LANGUAGES) {
    for (const stage of AI_ML_STAGES) {
      const sample = model.implementations[language.id]?.[stage.id];
      if (!sample) continue;
      if (sample.code.trim().length < MIN_CODE) {
        failures.push(
          `model "${model.slug}" ${language.label} / ${stage.label} code is shorter than ${MIN_CODE} chars`,
        );
      }
      if (sample.libraryName !== undefined && !sample.libraryName.trim()) {
        failures.push(`model "${model.slug}" ${language.label} / ${stage.label} has an empty libraryName`);
      }
    }
  }
}

function runCompleteChecks(): { failures: string[]; warnings: string[] } {
  const failures: string[] = [];
  const warnings: string[] = [];

  for (const model of AI_ML_MODELS) {
    checkModelContent(model, failures);
    for (const related of model.relatedSlugs) {
      if (!getModelBySlug(related)) {
        failures.push(`model "${model.slug}" relatedSlugs entry "${related}" does not resolve`);
      }
    }
  }

  for (const category of AI_ML_CATEGORIES) {
    const count = getModelsByCategory(category.id).length;
    if (count < MIN_MODELS_PER_CATEGORY) {
      warnings.push(
        `category "${category.id}" has only ${count} models (floor: ${MIN_MODELS_PER_CATEGORY})`,
      );
    }
  }

  if (existsSync(SNAPSHOT_PATH)) {
    const snapshot: LedgerEntry[] = JSON.parse(readFileSync(SNAPSHOT_PATH, 'utf-8'));
    const snapshotSlugs = new Set(snapshot.map((entry) => entry.slug));
    const currentSlugs = new Set(AI_ML_MODELS.map((model) => model.slug));
    for (const slug of snapshotSlugs) {
      if (!currentSlugs.has(slug)) failures.push(`model "${slug}" was in the ledger but is now missing`);
    }
    for (const slug of currentSlugs) {
      if (!snapshotSlugs.has(slug)) {
        failures.push(`model "${slug}" was added after the ledger snapshot — not in scope`);
      }
    }
  } else {
    warnings.push(`no ledger snapshot at ${SNAPSHOT_PATH} — run --structural first`);
  }

  return { failures, warnings };
}

function writeSnapshotIfAbsent(): void {
  if (existsSync(SNAPSHOT_PATH)) {
    log('INFO', 'ledger snapshot already exists, leaving it untouched', { path: SNAPSHOT_PATH });
    return;
  }
  const snapshot: LedgerEntry[] = AI_ML_MODELS.map((model) => ({
    slug: model.slug,
    name: model.name,
    category: model.category,
  })).sort((a, b) => a.slug.localeCompare(b.slug));

  mkdirSync(join(REPO_ROOT, 'scratchpad', 'ai-ml-sources'), { recursive: true });
  writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2), 'utf-8');
  log('INFO', 'wrote ledger snapshot', { path: SNAPSHOT_PATH, model_count: snapshot.length });
}

function main(): void {
  const mode = process.argv.includes('--complete')
    ? 'complete'
    : process.argv.includes('--structural')
      ? 'structural'
      : null;

  if (!mode) {
    log('ERROR', 'missing required flag: pass --structural or --complete');
    process.exit(1);
  }

  const failures: string[] = [];
  const warnings: string[] = [];

  checkIdentity(failures, warnings);
  checkClassificationAxes(failures);
  checkAppliedDomains(failures, warnings);
  checkDecisionTree(failures, warnings);
  checkOrderingMetadata(failures);
  checkOperationalGoals(failures);
  checkImplementationShape(failures, warnings);
  checkBundleSafety(failures);

  if (mode === 'complete') {
    const complete = runCompleteChecks();
    failures.push(...complete.failures);
    warnings.push(...complete.warnings);
  }

  for (const warning of warnings) log('WARN', warning);
  for (const failure of failures) log('ERROR', failure);

  if (failures.length > 0) {
    log('ERROR', `${mode} verification failed`, { failure_count: failures.length });
    process.exit(1);
  }

  if (mode === 'structural') writeSnapshotIfAbsent();

  log('INFO', `${mode} verification passed`, {
    model_count: AI_ML_MODELS.length,
    category_count: AI_ML_CATEGORIES.length,
    domain_count: APPLIED_DOMAINS.length,
    tree_nodes: DECISION_TREE.length,
    operational_goals: OPERATIONAL_GOALS.length,
    warning_count: warnings.length,
  });
  process.exit(0);
}

main();
