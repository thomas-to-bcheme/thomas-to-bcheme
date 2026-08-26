/**
 * Practical Technical page data
 *
 * The page's framing (per site owner): technical interview prep rests on
 * two fundamentals pillars — programming fundamentals AND agentic CLI tool
 * fundamentals (this portfolio itself is a Claude Code project, so agentic
 * workflow literacy is a first-class technical skill here, not a footnote).
 * Both pillars get exercised across two interview delivery formats
 * (live pairing / take-home), most commonly on LeetCode, HackerRank, and
 * CoderPad.
 */

import type { FrameworkStep } from '@/components/ui/FrameworkStepList';

export type InterviewMode = 'synchronous' | 'asynchronous';

export interface FundamentalsPillar {
  id: 'programming-fundamentals' | 'agentic-cli-fundamentals';
  label: string;
  description: string;
  topics: string[];
  supportsMode: InterviewMode[];
}

export const FUNDAMENTALS_PILLARS: FundamentalsPillar[] = [
  {
    id: 'programming-fundamentals',
    label: 'Programming Fundamentals',
    description:
      'Data structures, algorithms, and complexity analysis — the baseline vocabulary every technical interview format assumes, whether it is live or take-home.',
    topics: [
      'Arrays, hashmaps, and string manipulation',
      'Trees, graphs, and traversal strategies',
      'Recursion and iterative decomposition',
      'Sorting and searching strategies',
      'Time/space complexity (Big O) analysis',
      'Edge-case handling and input validation',
    ],
    supportsMode: ['synchronous', 'asynchronous'],
  },
  {
    id: 'agentic-cli-fundamentals',
    label: 'Agentic CLI Tool Fundamentals',
    description:
      'Fluency with agentic CLI coding tools (Claude Code and similar) — an increasingly real signal in technical interviews as agentic tools become standard practice, not a novelty. Most naturally demonstrated in take-home settings, though some live formats now explicitly allow it too.',
    topics: [
      'Scoping and prompting a task for an agent',
      'Verifying agent output rather than trusting it blindly',
      'Using tools like Read/Edit/Bash effectively',
      'Knowing when to delegate vs. drive directly',
      'Working within an existing codebase\'s conventions',
    ],
    supportsMode: ['asynchronous'],
  },
];

export interface InterviewModeProfile {
  mode: InterviewMode;
  label: string;
  description: string;
  whatItRewards: string[];
}

export const INTERVIEW_MODES: InterviewModeProfile[] = [
  {
    mode: 'synchronous',
    label: 'Live Pairing / Whiteboard',
    description:
      'Real-time collaboration with an interviewer in the room (or on the call) actively steering scope, asking follow-ups, and giving hints as you think out loud.',
    whatItRewards: [
      'Communication under pressure',
      'Incremental problem-solving visible in real time',
      'Handling live feedback and redirection',
    ],
  },
  {
    mode: 'asynchronous',
    label: 'Take-Home / Untimed',
    description:
      'Self-directed scoping with no interviewer present, often allowing real tools — search, documentation, and sometimes AI assistants.',
    whatItRewards: [
      'Code quality and polish',
      'Self-directed scope management',
      'Testing discipline',
      'Written communication (a README or PR description standing in for live narration)',
    ],
  },
];

export type PracticePlatformId = 'leetcode' | 'hackerrank' | 'coderpad';

export interface PracticePlatform {
  id: PracticePlatformId;
  label: string;
  primaryMode: InterviewMode;
  fundamentalsTested: string[];
  notes: string;
  mostCommon?: boolean;
}

export const PRACTICE_PLATFORMS: PracticePlatform[] = [
  {
    id: 'leetcode',
    label: 'LeetCode',
    primaryMode: 'asynchronous',
    fundamentalsTested: [
      'Algorithmic problem-solving',
      'Complexity analysis',
      'Pattern recognition across problem categories',
    ],
    notes:
      'Primarily a self-practice tool used on your own time, but the same problem set also shows up live — some interviewers screen-share a LeetCode-style problem and pair through it in real time.',
  },
  {
    id: 'hackerrank',
    label: 'HackerRank',
    primaryMode: 'asynchronous',
    fundamentalsTested: [
      'Correctness across hidden test cases',
      'Broader language/fundamentals coverage — not just algorithms',
      'SQL, shell, and OOP question tracks',
    ],
    notes:
      'Often the initial screen or take-home stage before a live round — untimed or loosely timed, with hidden test suites doing the grading instead of an interviewer.',
  },
  {
    id: 'coderpad',
    label: 'CoderPad',
    primaryMode: 'synchronous',
    mostCommon: true,
    fundamentalsTested: [
      'Real-time problem-solving with an interviewer watching',
      'Ability to run and debug code live',
      'Communication while coding',
    ],
    notes:
      'The most common live-interview tool in practice — supports multiple languages and sometimes a shared collaborative view, so the pairing feel matters as much as the code.',
  },
];

export type DevelopmentMindsetId = 'business-driven-development' | 'test-driven-development';

export interface DevelopmentMindset {
  id: DevelopmentMindsetId;
  label: string;
  framing: string;
  points: string[];
}

// The mindset above the "make it work/right/fast" progression below: not a
// formal methodology with its own ceremony, but the lens the whole
// progression gets run through. Business-Driven Development governs what
// each stage even means (both here at the implementation level and, one
// level up, at the system-design level); Test-Driven Development is treated
// as a cultural/structural practice — the boundaries it forces a team to
// find early are the same boundaries a repo's folder structure (monolith)
// or service split (microservices) tends to follow later.
export const DEVELOPMENT_MINDSETS: DevelopmentMindset[] = [
  {
    id: 'business-driven-development',
    label: 'Business-Driven Development',
    framing:
      "The mindset above the mindset — not a formal methodology with its own checklist, but the discipline of treating every technical decision, from a system's macro architecture down to a single function, as being in service of a business outcome rather than an end in itself.",
    points: [
      '"Make it work" means "meets the business requirement that justified writing this code" — confirm what outcome the code actually needs to produce before writing the simplest version of it, not just that it runs without crashing.',
      '"Make it right" and "make it fast" stay governed by the same lens: harden and optimize to the degree the business actually needs — a compliance-sensitive field needs validation a nightly background report does not; a user-facing checkout needs latency work a weekly export does not.',
      'This applies above the code too: monolith vs. microservices, SQL vs. NoSQL, build vs. buy are business decisions wearing technical clothing — team size, delivery speed, and operational maturity are business constraints, not just technical ones.',
      'Ask the business question before the technical one — "what does this need to be true for the business, and by when" — and let the technical approach follow from the answer, not the other way around.',
    ],
  },
  {
    id: 'test-driven-development',
    label: 'Test-Driven Development, as Culture',
    framing:
      'Less "write the test before the code" as a rule, and more a cultural stance that shapes how a codebase gets organized — a team that takes it seriously tends to end up with small, well-bounded, independently testable units, and that discipline shows up directly in the repository\'s folder structure.',
    points: [
      'Writing the test first forces a testable interface to exist before the implementation does — small, single-responsibility units with clear boundaries are the natural byproduct, not a separate "clean code" exercise layered on after.',
      'In a monolith, those boundaries usually show up as folder/module structure — a package per bounded context that stays testable in isolation, even though everything still ships and deploys together.',
      'In a microservice architecture, those same boundaries are often exactly where a service split happens later — the seams TDD forces a team to find early are the seams a future extraction would cut along anyway.',
      "Ask which stance a team already holds: is testability a design input from the start, or a pass added after the structure already exists — the answer says as much about a codebase's maintainability as its tech stack does.",
    ],
  },
];

// "Make it work, make it right, make it fast" — framed as talking points to raise
// with the interviewer at each transition, not a silent solo checklist. A deep
// dive under the Programming Fundamentals pillar, reusing the same FrameworkStep
// shape as System Design's InterviewFrameworkSection/MLSystemDesignFrameworkSection.
export const CODE_PROGRESSION_STEPS: FrameworkStep[] = [
  {
    id: 'make-it-work',
    marker: '1',
    label: 'Make It Work',
    description:
      "Ship the simplest version that's actually correct against the happy path — hardcoded values and thin error handling are acceptable debt here, not a failure, as long as the deadline is real and the scope was named out loud first.",
    detail: [
      "Say the trade-off before making it: \"I'm going to hardcode this / skip validation here to get something running — I'll call out what I'd harden next.\"",
      'Confirm scope with the interviewer rather than assuming it: is this throwaway for the exercise, or code expected to live on afterward?',
      "Match whatever naming/style convention is already on the screen, even if it isn't the convention you'd personally default to — introducing a second style mid-file is its own kind of debt.",
      'Naming a known shortcut out loud (a brute-force loop, an unvalidated input) is itself the signal an interviewer is listening for — silence about it reads as not knowing, saying it reads as knowing and choosing.',
    ],
  },
  {
    id: 'make-it-right',
    marker: '2',
    label: 'Make It Right',
    description:
      'Once it works, spend the next pass on type safety, docstrings, and specific error handling — small, incremental hardening rather than a rewrite, so the code stays maintainable without missing the deadline pressure that got it working in the first place.',
    detail: [
      'Ask which parts are worth hardening now versus flagged as a fast-follow — type hints and docstrings are usually cheap enough to do immediately; a full validation layer might not be.',
      'Replace bare/broad exception handling with specific exceptions and contextual logging — silent failures are the one thing not to leave in, regardless of time pressure.',
      'Check whether the team already has a style guide (PEP8, an internal lint config) before assuming one — "is there a convention I should be matching, or should I follow what\'s already in this file?" is a fair question to ask rather than a unilateral call.',
      'Refactor in small, reviewable increments — a function at a time — rather than one sweeping rewrite that is hard to verify.',
    ],
  },
  {
    id: 'make-it-fast',
    marker: '3',
    label: 'Make It Fast',
    description:
      'Only optimize once something correct exists to measure against — profile first, then address concurrency, data-structure choice, dead code, and duplicated logic where the numbers actually justify the added complexity.',
    detail: [
      "Ask if there's an actual latency/throughput target or SLA to design toward, or whether correctness is still the only bar today — optimizing without a target is guessing.",
      'Profile or reason about complexity before changing anything — name the bottleneck (an O(n²) scan, a sequential I/O loop) rather than optimizing the part that merely feels slow.',
      'Swap data structures where the access pattern justifies it (a list scan to a set/dict lookup), and remove dead code and duplicated logic uncovered along the way — cleanup that falls out of understanding the hot path, not a separate pass.',
      'State the before/after numbers, not just the technique — "this cut P95 latency from X to Y" is a stronger signal than describing the change alone.',
    ],
  },
];

// The nomenclature discussion the user specifically called out: match what's
// already there rather than mechanically forcing a style guide onto it.
export const NOMENCLATURE_DISCUSSION_POINTS: string[] = [
  'A style guide (PEP8, an ESLint config, a team wiki page) is a default, not an override — if the file already has an established convention, matching it beats applying the "correct" style guide inconsistently.',
  'When no convention exists yet, ask rather than assume: does the team already have one, or is this genuinely the first time it is being decided?',
  "Consistency within a file/module matters more than which specific convention won — a file that's 90% one naming style and 10% \"technically correct\" style reads worse than a file that's 100% consistent with itself.",
  'This is a conversation, not a unilateral call — naming it out loud ("I notice this file does X — keep matching that, or is there a broader guide I should switch to?") is itself part of demonstrating collaborative practice.',
];

export type CodeProgressionStageId = 'make-it-work' | 'make-it-right' | 'make-it-fast';
export type CodeProgressionLanguageId = 'sql' | 'python';

export interface CodeProgressionExample {
  stageId: CodeProgressionStageId;
  stageLabel: string;
  code: string;
  whatChanged: string;
  /** Illustrative order-of-magnitude KPI, not a claimed live measurement. */
  metric: string;
}

export interface CodeProgressionLanguageTrack {
  id: CodeProgressionLanguageId;
  label: string;
  scenario: string;
  examples: CodeProgressionExample[];
}

export const CODE_PROGRESSION_LANGUAGE_TRACKS: CodeProgressionLanguageTrack[] = [
  {
    id: 'sql',
    label: 'SQL',
    scenario:
      'A classic reporting query: total amount spent per active customer, across a customers/orders schema.',
    examples: [
      {
        stageId: 'make-it-work',
        stageLabel: 'Make It Work',
        code: `-- make it work: correlated subquery, SELECT * — returns correct rows today
SELECT *,
  (SELECT SUM(amount) FROM orders o WHERE o.customer_id = c.id) AS total_spent
FROM customers c;`,
        whatChanged:
          "Correct, and fast to write — but SELECT * pulls every column whether it's needed or not, and the correlated subquery re-runs once per customer row.",
        metric:
          'Illustrative: fine at a few hundred rows; the per-row subquery is the part that will not scale.',
      },
      {
        stageId: 'make-it-right',
        stageLabel: 'Make It Right',
        code: `-- make it right: explicit columns, JOIN instead of a correlated subquery,
-- COALESCE guards customers with zero orders, params replace string-built SQL
SELECT
  c.id,
  c.name,
  c.email,
  COALESCE(SUM(o.amount), 0) AS total_spent
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
WHERE c.is_active = TRUE
GROUP BY c.id, c.name, c.email
ORDER BY total_spent DESC
LIMIT $1 OFFSET $2;`,
        whatChanged:
          'An explicit column list replaces SELECT *, the correlated subquery becomes one LEFT JOIN + GROUP BY, COALESCE guards NULLs for customers with no orders yet, and $1/$2 are bind parameters instead of concatenated strings (closes a SQL-injection path) — same result set, now predictable regardless of table growth.',
        metric:
          'Illustrative: no longer one subquery execution per row — a single pass over both tables via the JOIN plan.',
      },
      {
        stageId: 'make-it-fast',
        stageLabel: 'Make It Fast',
        code: `-- make it fast: EXPLAIN ANALYZE pointed at a sequential scan on orders —
-- add the index the planner was missing, then wrap the query so future
-- callers reuse one definition instead of copy-pasting the JOIN
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_customer_id ON orders (customer_id);

CREATE VIEW active_customer_spend AS
SELECT
  c.id,
  c.name,
  c.email,
  COALESCE(SUM(o.amount), 0) AS total_spent
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
WHERE c.is_active = TRUE
GROUP BY c.id, c.name, c.email;`,
        whatChanged:
          "The missing index turns the JOIN's sequential scan into an index scan; wrapping the query in a view gives every future caller one shared definition instead of a duplicated copy of the same JOIN/GROUP BY.",
        metric:
          'Illustrative EXPLAIN ANALYZE-style shift: Seq Scan (actual time ≈ 1,600ms) → Index Scan (actual time ≈ 35ms) at roughly 250K orders — order of magnitude, not a live measurement.',
      },
    ],
  },
  {
    id: 'python',
    label: 'Python',
    scenario:
      'Given a list of user IDs, fetch each profile from an API and return the active ones, deduplicated.',
    examples: [
      {
        stageId: 'make-it-work',
        stageLabel: 'Make It Work',
        code: `def get_active_users(user_ids):
    results = []
    for uid in user_ids:
        user = requests.get("https://api.example.com/users/" + str(uid)).json()
        if user["status"] == "active":
            if user not in results:  # dedup via list scan
                results.append(user)
    print(results)  # debug leftover
    return results`,
        whatChanged:
          'Correct against the happy path. No type hints, no timeout, no error handling, a stray debug print, and dedup via `in` on a growing list — all acceptable for now, all named for the next pass.',
        metric: 'Illustrative: works fine for a handful of ids; every shortcut here is O(n) or worse.',
      },
      {
        stageId: 'make-it-right',
        stageLabel: 'Make It Right',
        code: `DEFAULT_TIMEOUT_SECONDS = 5
API_BASE_URL = "https://api.example.com/users"

def get_active_users(user_ids: list[int]) -> list[dict]:
    """Fetch each user's profile and return the active ones, deduplicated by id.

    Args:
        user_ids: User IDs to look up.

    Returns:
        Active user records, in first-seen order, with duplicate ids removed.
    """
    seen_ids: list[int] = []
    active_users: list[dict] = []
    for user_id in user_ids:
        try:
            response = requests.get(f"{API_BASE_URL}/{user_id}", timeout=DEFAULT_TIMEOUT_SECONDS)
            response.raise_for_status()
            user = response.json()
        except requests.RequestException as exc:
            logger.warning("user_fetch_failed user_id=%s error=%s", user_id, exc)
            continue

        if user["status"] == "active" and user["id"] not in seen_ids:
            seen_ids.append(user["id"])
            active_users.append(user)

    return active_users  # leftover print and the O(n²) dedup scan are left for the optimize pass`,
        whatChanged:
          'Type hints, a docstring, named constants instead of magic strings, and a specific exception (`RequestException`) with contextual logging replace the bare loop and silent failure. The debug print and the list-based dedup scan are deliberately left as-is — flagged for the optimization pass, not fixed here.',
        metric: 'Illustrative: no longer crashes or fails silently on a bad response; still sequential and still O(n²) on dedup.',
      },
      {
        stageId: 'make-it-fast',
        stageLabel: 'Make It Fast',
        code: `MAX_CONCURRENT_REQUESTS = 10

async def get_active_users(user_ids: list[int]) -> list[dict]:
    """Fetch each user's profile and return the active ones, deduplicated by id."""
    semaphore = asyncio.Semaphore(MAX_CONCURRENT_REQUESTS)

    async def fetch_one(client: httpx.AsyncClient, user_id: int) -> dict | None:
        async with semaphore:
            try:
                response = await client.get(f"{API_BASE_URL}/{user_id}", timeout=DEFAULT_TIMEOUT_SECONDS)
                response.raise_for_status()
                return response.json()
            except httpx.HTTPError as exc:
                logger.warning("user_fetch_failed user_id=%s error=%s", user_id, exc)
                return None

    async with httpx.AsyncClient() as client:
        users = await asyncio.gather(*(fetch_one(client, uid) for uid in user_ids))

    seen_ids: set[int] = set()  # O(n) list scan -> O(1) set membership
    active_users: list[dict] = []
    for user in users:
        if user and user["status"] == "active" and user["id"] not in seen_ids:
            seen_ids.add(user["id"])
            active_users.append(user)
    return active_users`,
        whatChanged:
          'Bounded concurrency (`asyncio.gather` capped by a semaphore) replaces the one-request-at-a-time loop; the dedup check moves from a list scan to a set; the leftover debug print is gone; and the fetch/error-handling logic lives once in `fetch_one` rather than being duplicated per call site.',
        metric:
          'Illustrative: 1,000 sequential calls at ~120ms each ≈ 120s wall clock vs. ~13s at 10-way bounded concurrency (~9x), and dedup drops from ~O(n²) comparisons to O(n) set lookups — order of magnitude, not a live measurement.',
      },
    ],
  },
];
