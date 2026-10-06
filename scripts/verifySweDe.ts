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
  OREILLY_BOOKS,
  OVERVIEW_FIGURES,
  PATH_ASSESSMENT,
  READING_STAGES,
  START_HERE_PATH,
  SWE_DE_LEVELS,
  TOPICS_BY_LEVEL,
  getBookById,
  getOreillyUrl,
  type BookId,
  type FigureSpec,
} from '../src/constants/sweDe';
import { EXTERNAL_REFERENCES } from '../src/constants/systemDesignPrep/externalReferences';

const REPO_ROOT = join(__dirname, '..');
const SRC_DIR = join(REPO_ROOT, 'src');
const OREILLY_ID_PATTERN = /^(\d{9}[\dX]|\d{13})$/;
const SWE_DE_CONTENT_DIRS = [
  join(SRC_DIR, 'constants', 'sweDe'),
  join(SRC_DIR, 'components', 'sections', 'sweDe'),
  join(SRC_DIR, 'app', 'swe-de'),
];
// /swe-de teaches fundamentals and first principles; it must not cite this portfolio as an example.
const WEIGHT_SUM_TOLERANCE = 1e-6;
const FORBIDDEN_PHRASE_PATTERN = /this (repo|site|portfolio)|my (portfolio|site)|evidencePath|REPO_PROOF|Proof from/i;
const REGISTRY_IMPORT_PATTERN = /from\s+['"]@\/constants\/sweDe(\/(index|books|readingPath|hardware|application|distributed))?['"]/;

/** Every topic across all levels — derived from TOPICS_BY_LEVEL so a new level can't be skipped by the checks. */
const ALL_TOPICS = Object.values(TOPICS_BY_LEVEL).flat();

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
  for (const topic of ALL_TOPICS) {
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

function checkUniqueIds(context: string, ids: string[]) {
  const seen = new Set<string>();
  ids.forEach((id) => {
    if (seen.has(id)) fail(`${context}: repeats id ${id}`);
    seen.add(id);
  });
}

function checkFigureSpec(figure: FigureSpec) {
  const context = `figure ${figure.id}`;
  if (figure.label.trim() === '') fail(`${context}: empty label`);
  if (figure.caption.trim() === '') fail(`${context}: empty caption`);
  const knownReferenceIds = new Set(EXTERNAL_REFERENCES.map((reference) => reference.id));
  (figure.sourceIds ?? []).forEach((sourceId) => {
    if (!knownReferenceIds.has(sourceId)) fail(`${context}: unknown source id ${sourceId}`);
  });
  (figure.bookIds ?? []).forEach((bookId) => {
    if (getBookById(bookId) === null) fail(`${context}: unknown book id ${bookId}`);
  });

  switch (figure.kind) {
    case 'flow':
      if (figure.lanes.length === 0) fail(`${context}: no lanes`);
      figure.lanes.forEach((lane) => {
        if (lane.steps.length === 0) fail(`${context}: lane ${lane.id} has no steps`);
        const stepIds = new Set<string>();
        lane.steps.forEach((step) => {
          if (stepIds.has(step.id)) fail(`${context}: lane ${lane.id} repeats step id ${step.id}`);
          stepIds.add(step.id);
          if (step.label.trim() === '') fail(`${context}: lane ${lane.id} step ${step.id} has an empty label`);
        });
      });
      break;
    case 'ladder':
      if (figure.rungs.length < 2) fail(`${context}: a ladder needs at least 2 rungs`);
      checkUniqueIds(context, figure.rungs.map((rung) => rung.id));
      figure.rungs.forEach((rung) => {
        if (!Number.isFinite(rung.log10Value)) fail(`${context}: rung ${rung.id} has a non-finite log10Value`);
        if (rung.valueLabel.trim() === '') fail(`${context}: rung ${rung.id} has an empty valueLabel`);
      });
      break;
    case 'strips':
      if (figure.lanes.length === 0) fail(`${context}: no lanes`);
      if (figure.legend.trim() === '') fail(`${context}: empty legend`);
      figure.lanes.forEach((lane) => {
        if (lane.cells.length === 0) fail(`${context}: lane ${lane.id} has no cells`);
        checkUniqueIds(`${context} lane ${lane.id}`, lane.cells.map((cell) => cell.id));
      });
      break;
    case 'roofline':
      if (!(figure.peakGflops > 0) || !(figure.bandwidthGBs > 0)) fail(`${context}: peakGflops and bandwidthGBs must be positive`);
      checkUniqueIds(context, figure.points.map((point) => point.id));
      figure.points.forEach((point) => {
        if (!(point.intensity > 0)) fail(`${context}: point ${point.id} needs a positive intensity`);
      });
      break;
    case 'triangle':
      checkUniqueIds(context, figure.markers.map((marker) => marker.id));
      figure.markers.forEach((marker) => {
        const weightSum = marker.weights.reduce((sum, weight) => sum + weight, 0);
        if (Math.abs(weightSum - 1) > WEIGHT_SUM_TOLERANCE || marker.weights.some((weight) => weight < 0)) {
          fail(`${context}: marker ${marker.id} weights must be non-negative and sum to 1 (got ${weightSum})`);
        }
      });
      break;
    case 'event-time':
      if (!(figure.axisMax > 0)) fail(`${context}: axisMax must be positive`);
      if (!(figure.windowEnd > 0 && figure.windowEnd <= figure.axisMax)) fail(`${context}: windowEnd must be within the axis`);
      if (!(figure.watermarkPassesAt > 0 && figure.watermarkPassesAt <= figure.axisMax)) fail(`${context}: watermarkPassesAt must be within the axis`);
      checkUniqueIds(context, figure.events.map((event) => event.id));
      figure.events.forEach((event) => {
        const isInsideAxis = (value: number) => value >= 0 && value <= figure.axisMax;
        if (!isInsideAxis(event.eventTime) || !isInsideAxis(event.processingTime)) fail(`${context}: event ${event.id} is outside the axis`);
        if (event.processingTime < event.eventTime) fail(`${context}: event ${event.id} is processed before it happened`);
      });
      break;
  }
}

/** Figure ids are DOM anchors, so they must be unique and must not shadow a topic id. */
function checkFigures() {
  const topicIds = new Set(ALL_TOPICS.map((topic) => topic.id));
  const figureIds = new Set<string>();
  const topicFigures = ALL_TOPICS.flatMap((topic) => (topic.visual ? [topic.visual] : []));
  for (const figure of [...topicFigures, ...OVERVIEW_FIGURES]) {
    if (figureIds.has(figure.id)) fail(`duplicate figure id: ${figure.id}`);
    if (topicIds.has(figure.id)) fail(`figure id ${figure.id} collides with a topic id`);
    figureIds.add(figure.id);
    checkFigureSpec(figure);
  }
  return figureIds.size;
}

function checkForbiddenPhrases() {
  for (const filePath of SWE_DE_CONTENT_DIRS.flatMap(listSourceFiles)) {
    if (FORBIDDEN_PHRASE_PATTERN.test(readFileSync(filePath, 'utf8'))) {
      fail(`${filePath.replace(`${REPO_ROOT}/`, '')} references this portfolio — /swe-de content must stay generic`);
    }
  }
}

checkBooks();
checkPathAndTopics();
const figureCount = checkFigures();
checkForbiddenPhrases();
checkExternalReferenceUrls();
checkClientImports();

if (failures.length > 0) {
  console.error(`level=ERROR check=verify-swe-de failures=${failures.length}`);
  failures.forEach((message) => console.error(`  - ${message}`));
  process.exit(1);
}

console.log(
  `level=INFO check=verify-swe-de status=pass books=${OREILLY_BOOKS.length} stages=${READING_STAGES.length} topics=${ALL_TOPICS.length} figures=${figureCount}`,
);
process.exit(0);
