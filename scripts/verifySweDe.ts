/**
 * verifySweDe.ts
 *
 * Data-integrity gate for the /swe-de reading path, modelled on
 * scripts/verifyAiMl.ts. A standalone script rather than module-scope throws,
 * so a bad entry fails the gate instead of shipping a throw into a bundle.
 *
 * Usage: npx tsx scripts/verifySweDe.ts
 * Exit 0 on success, 1 on any failure (CLAUDE.md §5). Read-only, idempotent.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import {
  APPLICATION_TOPICS,
  DISTRIBUTED_TOPICS,
  HARDWARE_TOPICS,
  OREILLY_BOOKS,
  PATH_ASSESSMENT,
  READING_STAGES,
  START_HERE_PATH,
  SWE_DE_LEVELS,
  TOPICS_BY_LEVEL,
  getBookById,
  getOreillyUrl,
  type BookId,
} from '../src/constants/sweDe';
import { EXTERNAL_REFERENCES } from '../src/constants/systemDesignPrep/externalReferences';

const REPO_ROOT = join(__dirname, '..');
const SRC_DIR = join(REPO_ROOT, 'src');
const OREILLY_ID_PATTERN = /^(\d{9}[\dX]|\d{13})$/;
const REGISTRY_IMPORT_PATTERN = /from\s+['"]@\/constants\/sweDe(\/(index|books|readingPath|hardware|application|distributed))?['"]/;

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
  const seenOreillyIds = new Set<string>();
  for (const book of OREILLY_BOOKS) {
    if (seenIds.has(book.id)) fail(`duplicate book id: ${book.id}`);
    seenIds.add(book.id);
    if (seenOreillyIds.has(book.oreillyId)) fail(`duplicate oreillyId ${book.oreillyId} (book ${book.id})`);
    seenOreillyIds.add(book.oreillyId);
    if (!OREILLY_ID_PATTERN.test(book.oreillyId)) fail(`book ${book.id}: oreillyId "${book.oreillyId}" is not 10 or 13 characters`);
    if (book.isbn13 !== null && !isValidIsbn13(book.isbn13)) fail(`book ${book.id}: isbn13 "${book.isbn13}" fails the checksum`);
    if (!/^[a-z0-9-]+$/.test(book.slug)) fail(`book ${book.id}: slug "${book.slug}" is not kebab-case`);
    if (book.authors.length === 0) fail(`book ${book.id}: no authors`);
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
  PATH_ASSESSMENT.forEach((item) => checkReferences(`assessment ${item.id}`, item.bookIds));

  const stagedBookIds = new Set(READING_STAGES.flatMap((stage) => stage.bookIds));
  OREILLY_BOOKS.filter((book) => !stagedBookIds.has(book.id)).forEach((book) =>
    fail(`book ${book.id} is in the registry but on no reading stage`),
  );

  const topicIds = new Set<string>();
  for (const topic of [...HARDWARE_TOPICS, ...APPLICATION_TOPICS, ...DISTRIBUTED_TOPICS]) {
    if (topicIds.has(topic.id)) fail(`duplicate topic id: ${topic.id}`);
    topicIds.add(topic.id);
    checkReferences(`topic ${topic.id}`, topic.sourceBookIds);
    if (!TOPICS_BY_LEVEL[topic.level].includes(topic)) fail(`topic ${topic.id}: level "${topic.level}" does not match its file`);
    topic.comparison?.rows.forEach((row) => {
      if (row.cells.length !== topic.comparison?.columns.length) {
        fail(`topic ${topic.id}: comparison row ${row.id} has ${row.cells.length} cells for ${topic.comparison?.columns.length} columns`);
      }
    });
  }

  SWE_DE_LEVELS.forEach((level) => {
    if (TOPICS_BY_LEVEL[level.id].length === 0) fail(`level ${level.id} has no topics`);
    if (!READING_STAGES.some((stage) => stage.kind === level.id)) fail(`level ${level.id} has no reading stage`);
  });
}

function checkExternalReferenceUrls() {
  EXTERNAL_REFERENCES.filter((reference) => reference.url.trim() === '').forEach((reference) =>
    fail(`external reference ${reference.id} has an empty url (registry lookup failed)`),
  );
  OREILLY_BOOKS.filter((book) => book.isListingPending !== true && getOreillyUrl(book) === null).forEach((book) =>
    fail(`book ${book.id}: listed but produced no URL`),
  );
}

function listSourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) return listSourceFiles(fullPath);
    return /\.(ts|tsx)$/.test(entry) ? [fullPath] : [];
  });
}

/** Client components must import ./types or ./levels only, never the registry. */
function checkClientImports() {
  for (const filePath of listSourceFiles(SRC_DIR)) {
    const source = readFileSync(filePath, 'utf8');
    if (!/^\s*['"]use client['"]/m.test(source)) continue;
    if (REGISTRY_IMPORT_PATTERN.test(source)) {
      fail(`'use client' file ${filePath.replace(`${REPO_ROOT}/`, '')} imports the sweDe registry — import @/constants/sweDe/types instead`);
    }
  }
}

checkBooks();
checkPathAndTopics();
checkExternalReferenceUrls();
checkClientImports();

if (failures.length > 0) {
  console.error(`level=ERROR check=verify-swe-de failures=${failures.length}`);
  failures.forEach((message) => console.error(`  - ${message}`));
  process.exit(1);
}

console.log(
  `level=INFO check=verify-swe-de status=pass books=${OREILLY_BOOKS.length} stages=${READING_STAGES.length} topics=${HARDWARE_TOPICS.length + APPLICATION_TOPICS.length + DISTRIBUTED_TOPICS.length}`,
);
process.exit(0);
