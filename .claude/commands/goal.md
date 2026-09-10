---
description: Author the next AI/ML model entries from the backlog, with full verification
---

# Goal: continue the /ai-ml model build

You are continuing a long-running content build. **Assume you have no memory of
previous sessions** — everything you need is in the repository. Do not ask the
user what to work on; the repository knows.

## 1. Orient (always do this first)

```bash
npm run audit:ai-ml
```

That prints progress and the next entries in work order. The canonical worklist
is `src/constants/aiMl/backlog.ts`; the design rationale is
`.claude/plans/i-want-a-similar-synchronous-turing.md` (read the **Data** and
**Proposed model list** sections if anything below is unclear).

Take the next **2 models** from `npm run audit:ai-ml -- --next 2` unless the user
named specific ones in `$ARGUMENTS`.

## 2. Author each model

Create `src/constants/aiMl/models/<category>/<slug>.ts` exporting a
`const` of type `AiMlModel` (type in `src/constants/aiMl/types.ts`).

**Copy the shape from an exemplar in the same category** — read one first:
- `models/classical-ml/linear-regression.ts` — the reference entry
- `models/deep-learning/lstm.ts` — carries `architecture`
- `models/generative-ai/vae.ts` — `elbo` objective, breadth domains
- `models/reinforcement-learning/q-learning.ts` — `fixed-point` objective

### Non-negotiables

**Nine code samples per model.** Python, C/C++, Rust × `make-it-work`,
`make-it-right`, `make-it-fast`. These are *representative reference code for
study* — they do not need to compile or run, but they must be realistic, idiomatic,
and genuinely illustrate the algorithm. This is the primary deliverable.

- `make-it-work` — the math transcribed literally. Loops, no tricks, no ML
  library imports (the verifier enforces this). Reads line-by-line against the
  objective above it.
- `make-it-right` — how that language actually wants it written. Must set
  `rationale` (what changed vs. the previous stage) and `conventions`, each
  drawn **verbatim** from `LANGUAGE_STANDARDS[lang].conventions` in
  `src/constants/aiMl/languageStandards.ts`.
- `make-it-fast` — must set `rationale` and `optimizations`, each `technique`
  drawn **verbatim** from `LANGUAGE_STANDARDS[lang].optimizationLevers`, and
  each carrying a real `tradeoff`. **The three stages must differ materially** —
  the verifier string-compares them.

**Cross-axis rule that trips people up:** if
`applications.featured['anomaly-detection'].fit !== 'not-applicable'`, then
`taskTypes` **must** include `'anomaly-detection'`. This has caught real errors
repeatedly.

**Other required fields:** all three featured domains (a genuine
`not-applicable` with a one-line `why` is correct and preferred over a
fabricated fit); `deployment`; `pros`/`cons` where every entry has a non-empty
`context`; `objective.kind` chosen honestly (`loss`, `elbo`, `likelihood`,
`minimax`, `fixed-point`, `margin`, `reconstruction`); `architecture` iff
category is `deep-learning`.

**Voice:** match the exemplars. State the trade-off, name the characteristic
failure mode, say when the model is the *wrong* choice. Illustrative cost
profiles must be labelled as such, never presented as measured benchmarks.

### Register it

Add the import and array entry to
`src/constants/aiMl/models/<category>/index.ts`, keeping backlog order.

## 3. Verify — all four gates must pass

```bash
python3 scripts/lib/escapeSampleBackticks.py src/constants/aiMl/models/<category>/<slug>.ts
npx tsc --noEmit
npm run verify:ai-ml -- --structural
npm run audit:ai-ml
```

Run the backtick escaper **first** — Rust doc comments and Python docstrings
contain backticks that silently terminate the TS template literal.

`verify:ai-ml` WARNs about unresolved `relatedSlugs` and unreachable decision-tree
targets. **Those warnings are expected** and resolve as the backlog fills. Only
`level=ERROR` blocks.

Run `npm run build` only if no dev server is live — check with
`lsof -nP -iTCP:3000 -sTCP:LISTEN`, never `pgrep -f` with alternation. Running a
build against a live `next dev` corrupts the Turbopack cache.

## 4. Commit before you stop

Progress must survive the session. Once the gates are green:

```bash
git add -A && git commit -m "Add <slugs> to AI/ML model reference"
git fetch origin && git rebase origin/main && git push
```

Push straight to `main` — no feature branch. Rebase first, since automated
Excalidraw autosaves also land there.

## 5. Report

State: models authored this run, the new count from `audit:ai-ml`, any gate
failure and how it was resolved, and what is next. Be brief.

---

$ARGUMENTS
