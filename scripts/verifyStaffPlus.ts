/**
 * verifyStaffPlus.ts
 *
 * Data-integrity gate for the /projects Senior-to-Staff+ section and the
 * Leadership & Recognition stories it cites as evidence. Modelled on
 * scripts/verifySweDe.ts: a standalone script rather than module-scope throws,
 * so a bad entry fails the gate instead of shipping a throw into a bundle.
 *
 * Usage: npx tsx scripts/verifyStaffPlus.ts
 * Exit 0 on success, 1 on any failure (CLAUDE.md §5). Read-only, idempotent.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import {
  LISTENING_SKILLS,
  PLAYBOOK_FRAMEWORKS,
  STAFF_PLUS_TOPICS,
  STAKEHOLDER_INTAKE_QUESTIONS,
  type QuestionKind,
} from '../src/constants/staffPlus';
import { CHANGELOG_TOC_ITEMS } from '../src/constants/changelogToc';
import { COMPETENCY_STORIES } from '../src/data/credentials';

const REPO_ROOT = join(__dirname, '..');
const STAFF_PLUS_CONTENT_DIRS = [
  join(REPO_ROOT, 'src', 'constants', 'staffPlus'),
  join(REPO_ROOT, 'src', 'components', 'sections', 'changelog', 'staffPlus'),
];

const REQUIRED_TOPIC_IDS = [
  'navigating-ambiguity',
  'root-cause-analysis',
  'stakeholder-communication',
  'managing-timelines',
  'business-design-from-data',
  'data-ingestion',
  'schema-validation',
  'testing-and-monitoring',
  'big-data-scalability',
];
const REQUIRED_INTAKE_IDS = ['data-source', 'stakeholders', 'requirements'];
const REQUIRED_QUESTION_KINDS: QuestionKind[] = ['reflective', 'active', 'probing', 'deeper'];
const REQUIRED_SECTION_IDS = ['leadership', 'staff-plus'];
const MIN_STORY_BULLETS = 1;
const MAX_STORY_BULLETS = 3;
// The advice is generic engineering guidance; it must not read as a claim about this portfolio.
const FORBIDDEN_PHRASE_PATTERN = /\bthis (repo|site|portfolio)\b|\bmy (portfolio|site)\b/i;

const failures: string[] = [];
const fail = (message: string) => failures.push(message);

function checkUniqueIds(context: string, ids: string[]) {
  const seen = new Set<string>();
  ids.forEach((id) => {
    if (seen.has(id)) fail(`${context}: repeats id ${id}`);
    seen.add(id);
  });
}

function checkTopics() {
  checkUniqueIds('STAFF_PLUS_TOPICS', STAFF_PLUS_TOPICS.map((topic) => topic.id));
  const topicIds = new Set(STAFF_PLUS_TOPICS.map((topic) => topic.id));
  REQUIRED_TOPIC_IDS.filter((id) => !topicIds.has(id)).forEach((id) => fail(`missing required topic ${id}`));

  const storyIds = new Set(COMPETENCY_STORIES.map((story) => story.id));
  for (const topic of STAFF_PLUS_TOPICS) {
    const context = `topic ${topic.id}`;
    const requiredText: Array<[string, string]> = [
      ['title', topic.title],
      ['summary', topic.summary],
      ['insight', topic.insight],
      ['seniorToStaffShift.senior', topic.seniorToStaffShift.senior],
      ['seniorToStaffShift.staff', topic.seniorToStaffShift.staff],
      ['businessLens.risk', topic.businessLens.risk],
      ['businessLens.spend', topic.businessLens.spend],
      ['businessLens.financialAlignment', topic.businessLens.financialAlignment],
    ];
    requiredText.filter(([, value]) => value.trim() === '').forEach(([field]) => fail(`${context}: empty ${field}`));

    if (topic.bestPractices.length === 0) fail(`${context}: no best practices`);
    if (topic.industryStandards.length === 0) fail(`${context}: no industry standards`);
    topic.industryStandards.forEach((standard) => {
      if (standard.name.trim() === '' || standard.description.trim() === '') fail(`${context}: incomplete industry standard`);
    });

    REQUIRED_QUESTION_KINDS.filter((kind) => !topic.coreQuestions.some((question) => question.kind === kind)).forEach(
      (kind) => fail(`${context}: no ${kind} question`),
    );
    topic.coreQuestions.forEach((question) => {
      if (question.question.trim() === '' || question.whyItWorks.trim() === '') fail(`${context}: incomplete ${question.kind} question`);
    });

    if (topic.relatedStoryIds.length === 0) fail(`${context}: cites no related story`);
    topic.relatedStoryIds
      .filter((id) => !storyIds.has(id))
      .forEach((id) => fail(`${context}: relatedStoryIds has unknown story ${id}`));
  }
}

function checkPrimerAndIntake() {
  REQUIRED_QUESTION_KINDS.filter((kind) => !LISTENING_SKILLS.some((skill) => skill.kind === kind)).forEach((kind) =>
    fail(`LISTENING_SKILLS: missing ${kind}`),
  );
  LISTENING_SKILLS.forEach((skill) => {
    if (skill.examplePhrases.length === 0) fail(`LISTENING_SKILLS ${skill.kind}: no example phrases`);
  });
  checkUniqueIds('PLAYBOOK_FRAMEWORKS', PLAYBOOK_FRAMEWORKS.map((framework) => framework.id));

  checkUniqueIds('STAKEHOLDER_INTAKE_QUESTIONS', STAKEHOLDER_INTAKE_QUESTIONS.map((item) => item.id));
  const intakeIds = new Set(STAKEHOLDER_INTAKE_QUESTIONS.map((item) => item.id));
  REQUIRED_INTAKE_IDS.filter((id) => !intakeIds.has(id)).forEach((id) => fail(`missing stakeholder intake question ${id}`));
  STAKEHOLDER_INTAKE_QUESTIONS.forEach((item) => {
    if (item.identify.trim() === '' || item.determines.trim() === '') fail(`intake ${item.id}: empty identify/determines`);
    if (item.followUps.length === 0) fail(`intake ${item.id}: no follow-up questions`);
  });
}

function checkStories() {
  checkUniqueIds('COMPETENCY_STORIES', COMPETENCY_STORIES.map((story) => story.id));
  for (const story of COMPETENCY_STORIES) {
    const count = story.coreBullets.length;
    if (count < MIN_STORY_BULLETS || count > MAX_STORY_BULLETS) {
      fail(`story ${story.id}: ${count} core bullets (expected ${MIN_STORY_BULLETS}-${MAX_STORY_BULLETS})`);
    }
    story.coreBullets.filter((bullet) => bullet.trim() === '').forEach(() => fail(`story ${story.id}: empty bullet`));
  }
}

function checkToc() {
  const tocIds = CHANGELOG_TOC_ITEMS.map((item) => item.id);
  checkUniqueIds('CHANGELOG_TOC_ITEMS', tocIds);
  const tocIdSet = new Set(tocIds);
  [...REQUIRED_SECTION_IDS, ...STAFF_PLUS_TOPICS.map((topic) => topic.id)]
    .filter((id) => !tocIdSet.has(id))
    .forEach((id) => fail(`CHANGELOG_TOC_ITEMS is missing ${id}`));
}

function listSourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) return listSourceFiles(fullPath);
    return /\.(ts|tsx)$/.test(entry) ? [fullPath] : [];
  });
}

function checkForbiddenPhrases() {
  for (const dir of STAFF_PLUS_CONTENT_DIRS) {
    for (const filePath of listSourceFiles(dir)) {
      const source = readFileSync(filePath, 'utf8');
      if (FORBIDDEN_PHRASE_PATTERN.test(source)) fail(`${filePath.replace(`${REPO_ROOT}/`, '')}: self-referential portfolio phrase`);
    }
  }
}

checkTopics();
checkPrimerAndIntake();
checkStories();
checkToc();
checkForbiddenPhrases();

if (failures.length > 0) {
  console.error(`verifyStaffPlus: ${failures.length} failure(s)`);
  failures.forEach((message) => console.error(`  - ${message}`));
  process.exit(1);
}
console.log(
  `verifyStaffPlus: ok (${STAFF_PLUS_TOPICS.length} topics, ${COMPETENCY_STORIES.length} stories, ${CHANGELOG_TOC_ITEMS.length} toc items)`,
);
