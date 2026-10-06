/**
 * verifyDeployOps.ts
 *
 * Data-integrity gate for the /deployops section, modelled on
 * scripts/verifySweDe.ts. A standalone script rather than module-scope throws,
 * so a bad entry fails the gate instead of shipping a throw into a bundle.
 *
 * Checks: book registry integrity (ids, ISBN checksums), that every cited
 * book/stage id resolves, that every book sits on a reading stage, that the
 * nine lifecycle stages are all covered, that client components never import
 * the registry barrel, and that the educational pages carry no references to
 * the portfolio, site or repo.
 *
 * Usage: npx tsx scripts/verifyDeployOps.ts
 * Exit 0 on success, 1 on any failure (CLAUDE.md §5). Read-only, idempotent.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import {
  AI_TOPICS,
  DEPLOYOPS_BOOKS,
  DEPLOYOPS_LEVELS,
  DEVOPS_TOPICS,
  LIFECYCLE_STAGES,
  READING_STAGES,
  START_HERE_PATH,
  TERMS,
  TOPICS_BY_LEVEL,
  getBookById,
  type BookId,
  type StageId,
} from '../src/constants/deployOps';

const REPO_ROOT = join(__dirname, '..');
const SRC_DIR = join(REPO_ROOT, 'src');
const VALID_STAGE_IDS = new Set<StageId>(LIFECYCLE_STAGES.map((stage) => stage.id));
const REGISTRY_IMPORT_PATTERN =
  /from\s+['"]@\/constants\/deployOps(\/(index|books|readingPath|devopsTopics|aiTopics|terms|lifecycle|strategies))?['"]/;
const FORBIDDEN_PHRASE_PATTERN = /this (repo|site|portfolio)|evidencePath|REPO_PROOF|Proof from/i;

const failures: string[] = [];
const fail = (message: string) => failures.push(message);

function isValidIsbn13(isbn: string): boolean {
  if (!/^\d{13}$/.test(isbn)) return false;
  const digits = [...isbn].map(Number);
  const weightedSum = digits
    .slice(0, 12)
    .reduce((sum, digit, position) => sum + digit * (position % 2 === 0 ? 1 : 3), 0);
  return (10 - (weightedSum % 10)) % 10 === digits[12];
}

function checkBooks() {
  const seenIds = new Set<string>();
  for (const book of DEPLOYOPS_BOOKS) {
    if (seenIds.has(book.id)) fail(`duplicate book id: ${book.id}`);
    seenIds.add(book.id);
    if (book.isbn13 !== null && !isValidIsbn13(book.isbn13)) fail(`book ${book.id}: isbn13 "${book.isbn13}" fails the checksum`);
    if (book.authors.length === 0) fail(`book ${book.id}: no authors`);
    if (book.takeaways.length === 0) fail(`book ${book.id}: no takeaways`);
    if (book.stageIds.length === 0) fail(`book ${book.id}: serves no lifecycle stage`);
    book.stageIds.forEach((stageId) => {
      if (!VALID_STAGE_IDS.has(stageId)) fail(`book ${book.id}: unknown stage id ${stageId}`);
    });
    if (book.url !== null && !/^https:\/\//.test(book.url)) fail(`book ${book.id}: url is not https`);
  }
}

function checkReferences(context: string, bookIds: BookId[]) {
  if (bookIds.length === 0) fail(`${context}: cites no books`);
  for (const bookId of bookIds) {
    if (getBookById(bookId) === null) fail(`${context}: unknown book id ${bookId}`);
  }
}

function checkPathAndTopics() {
  checkReferences('START_HERE_PATH', START_HERE_PATH);
  READING_STAGES.forEach((stage) => checkReferences(`stage ${stage.id}`, stage.bookIds));

  const stagedBookIds = new Set(READING_STAGES.flatMap((stage) => stage.bookIds));
  DEPLOYOPS_BOOKS.filter((book) => !stagedBookIds.has(book.id)).forEach((book) =>
    fail(`book ${book.id} is in the registry but on no reading stage`),
  );

  const topicIds = new Set<string>();
  for (const level of DEPLOYOPS_LEVELS) {
    const topics = TOPICS_BY_LEVEL[level.id];
    if (topics.length === 0) fail(`level ${level.id}: no topics`);
    for (const topic of topics) {
      if (topicIds.has(topic.id)) fail(`duplicate topic id: ${topic.id}`);
      topicIds.add(topic.id);
      if (topic.level !== level.id) fail(`topic ${topic.id}: level "${topic.level}" is filed under ${level.id}`);
      if (topic.how.length === 0) fail(`topic ${topic.id}: empty how[]`);
      if (topic.stageIds.length === 0) fail(`topic ${topic.id}: serves no lifecycle stage`);
      topic.stageIds.forEach((stageId) => {
        if (!VALID_STAGE_IDS.has(stageId)) fail(`topic ${topic.id}: unknown stage id ${stageId}`);
      });
      checkReferences(`topic ${topic.id}`, topic.sourceBookIds);
    }
  }
}

function checkStageCoverage() {
  for (const stage of LIFECYCLE_STAGES) {
    const coveredByDevops = DEVOPS_TOPICS.some((topic) => topic.stageIds.includes(stage.id));
    const coveredByAi = AI_TOPICS.some((topic) => topic.stageIds.includes(stage.id));
    if (!coveredByDevops) fail(`stage ${stage.id}: no DevOps topic specializes it`);
    if (!coveredByAi) fail(`stage ${stage.id}: no AI/LLM/MLOps topic specializes it`);
  }

  const whatChanges = AI_TOPICS.find((topic) => topic.id === 'what-changes');
  const rowIds = new Set(whatChanges?.comparison?.rows.map((row) => row.id) ?? []);
  if (!whatChanges?.comparison) fail('AI topic "what-changes" has no per-stage comparison table');
  for (const stageId of VALID_STAGE_IDS) {
    if (whatChanges?.comparison && !rowIds.has(stageId)) fail(`what-changes table: missing row for stage ${stageId}`);
  }
}

function checkTerms() {
  const seen = new Set<string>();
  for (const term of TERMS) {
    if (seen.has(term.id)) fail(`duplicate term id: ${term.id}`);
    seen.add(term.id);
    if (term.definition.trim().length === 0) fail(`term ${term.id}: empty definition`);
  }
}

function listFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? listFiles(path) : [path];
  });
}

function checkClientImportsAndWording() {
  const deployOpsFiles = [
    ...listFiles(join(SRC_DIR, 'constants', 'deployOps')),
    ...listFiles(join(SRC_DIR, 'components', 'sections', 'deployOps')),
    ...listFiles(join(SRC_DIR, 'app', 'deployops')),
  ];
  const clientFiles = [...deployOpsFiles, ...listFiles(join(SRC_DIR, 'components', 'ui'))].filter((path) => {
    if (!/\.(ts|tsx)$/.test(path)) return false;
    const head = readFileSync(path, 'utf8').slice(0, 200);
    return /^\s*['"]use client['"]/.test(head);
  });

  for (const path of clientFiles) {
    if (REGISTRY_IMPORT_PATTERN.test(readFileSync(path, 'utf8'))) {
      fail(`${path.replace(`${REPO_ROOT}/`, '')}: client component imports the deployOps registry barrel`);
    }
  }

  for (const path of deployOpsFiles.filter((file) => /\.(ts|tsx)$/.test(file))) {
    const match = FORBIDDEN_PHRASE_PATTERN.exec(readFileSync(path, 'utf8'));
    if (match !== null) fail(`${path.replace(`${REPO_ROOT}/`, '')}: contains "${match[0]}" (the page must be purely educational)`);
  }
}

checkBooks();
checkPathAndTopics();
checkStageCoverage();
checkTerms();
checkClientImportsAndWording();

if (failures.length > 0) {
  console.error(`verifyDeployOps: ${failures.length} failure(s)`);
  failures.forEach((message) => console.error(`  - ${message}`));
  process.exit(1);
}
console.log(
  `verifyDeployOps: ok (${DEPLOYOPS_BOOKS.length} books, ${READING_STAGES.length} stages, ` +
    `${DEVOPS_TOPICS.length + AI_TOPICS.length} topics, ${TERMS.length} terms)`,
);
