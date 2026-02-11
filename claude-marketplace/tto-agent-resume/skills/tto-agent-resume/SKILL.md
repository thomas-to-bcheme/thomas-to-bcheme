---
name: tto-agent-resume
description: Resume maintenance for editing resume.md, content validation, and PDF generation
tools: Read, Edit, Grep, Bash, Write
---

# /tto-agent-resume - Resume Maintenance

## Purpose

Maintain `src/docs/resume.md` as the single source of truth for Thomas To's resume. Edit content, validate writing style, and generate `src/docs/Thomas_To_Resume.pdf` via md-to-pdf with CSS styling from `src/docs/resume-style.css`.

---

## Workflow

### Step 1: Display Development Directives

Display these 5 principles at the start of every response:

1. NO HARDCODING, EVER
2. ROOT CAUSE, NOT BANDAID
3. DATA INTEGRITY
4. ASK QUESTIONS BEFORE CHANGING CODE
5. DISPLAY PRINCIPLES

### Step 2: Read Current State

```
Read src/docs/resume.md
```

- Parse YAML frontmatter (lines 1-11). Never modify this block.
- Count characters in content body (after second `---`).
- Target: 3500-4000 chars for single-page fit.
- Note current sections: Professional Summary, Relevant Experience, Supplemental Experience, Education.

### Step 3: Apply Edits

**Option A: User-Directed Edits**
- Add, update, or remove bullets/sections as requested.
- Preserve bullet format: `Action verb + context + impact + metric`.
- Use past tense for prior roles, present tense for current roles.

**Option B: Job-Description Tailoring**
- Read the provided job description.
- Extract target keywords and requirements.
- Reframe existing bullets to align with JD keywords.
- Reorder bullets within sections to front-load relevant experience.
- Never fabricate experience, metrics, or credentials.
- Present proposed changes to user before writing.

### Step 4: Validate Content

Run all validation checks on the edited content:

**4a. Banned Words Check**

Search resume.md for any of these 133 banned words (case-insensitive):

can, may, just, that, very, really, literally, actually, certainly, probably, basically, could, maybe, delve, embark, enlightening, esteemed, shed light, craft, curating, imagine, realm, game-changer, unlock, discover, skyrocket, abyss, not alone, in a world where, revolutionize, disruptive, utilize, utilizing, dive deep, tapestry, illuminate, unveil, pivotal, intricate, elucidate, hence, furthermore, however, harness, exciting, groundbreaking, cutting-edge, remarkable, it remains to be seen, glimpse into, navigating, landscape, stark, testament, in summary, in conclusion, moreover, boost, skyrocketing, opened up, powerful, inquiries, ever-evolving

Use Grep tool with case-insensitive flag to check.

**4b. Punctuation Check**

- Em dashes (`—`): Zero allowed. Replace with commas or periods.
- Semicolons (`;`): Zero allowed. Replace with commas or periods.

**4c. Voice Check**

Flag passive voice patterns:
- `was [verb]ed`
- `were [verb]ed`
- `has been`
- `have been`
- `is being`

Suggest active voice rewrites for each occurrence.

**4d. Length Check**

Count characters in content body (excluding YAML frontmatter):
- 3500-4000 chars: Safe (single page)
- 4000-4200 chars: Warning (tight fit)
- >4200 chars: Error (likely multi-page, suggest reductions)

### Step 5: Write Updated resume.md

- Preserve YAML frontmatter exactly (lines 1-11).
- Write the updated content body.
- Use the Edit tool for targeted changes. Use Write tool for full rewrites only.

### Step 6: Generate PDF

```bash
npx md-to-pdf src/docs/resume.md
```

This generates `src/docs/resume.pdf`. Rename to the standard filename:

```bash
mv src/docs/resume.pdf src/docs/Thomas_To_Resume.pdf
```

### Step 7: Report Summary

Output a structured summary:

```
Resume Update Summary:

Changes:
- [list each change made]

Validation:
- Banned words: [count] found / 0 found
- Em dashes: [count] found / 0 found
- Semicolons: [count] found / 0 found
- Passive voice: [count] found / 0 found
- Character count: [N] chars (~[N/3750] pages)

PDF:
- Generated: src/docs/Thomas_To_Resume.pdf
- File size: [size]
- Estimated pages: [1 or warning]

Next: Review PDF visually to confirm single-page layout.
```

---

## Decision Points (Ask User)

| Situation | Question | Default |
|-----------|----------|---------|
| Archive before overwrite | "Archive current PDF as Thomas_To_Resume_{suffix}.pdf?" | No |
| Validation warnings found | "Apply suggested fixes for [N] warnings?" | Ask |
| Content exceeds page limit | "Reduce content? Suggest removing: [bullets]" | Ask |
| Job description provided | "Reframe for these keywords: [list]. Proceed?" | Ask |

---

## Error Handling

| Error | Solution |
|-------|----------|
| `md-to-pdf` not found | Run `npm install -D md-to-pdf` or use `npx md-to-pdf` |
| PDF generation fails | Check that Puppeteer is installed: `npm ls puppeteer` |
| PDF > ~250KB | Likely multi-page. Suggest content reduction |
| resume.md missing frontmatter | Restore YAML frontmatter block from template |
| Stylesheet path invalid | Verify `resume-style.css` exists at the absolute path in frontmatter |

---

## CSS Reference (read-only)

From `src/docs/resume-style.css`:
- Font: Times New Roman, 10.5pt, line-height 1.25
- H1: 20pt centered bold (name)
- H2: 11pt uppercase, 1.5px bottom border (section headers)
- Page: Letter format, 0.4in top/bottom, 0.5in left/right margins
- Links: Blue (#1155cc), underlined

---

## Example Usage

### Example 1: Add a Bullet

**User**: "Add a bullet to Canventa about deploying a RAG agent on GCP."

**Agent**:
1. Reads resume.md
2. Drafts bullet: "Deployed RAG AI Agent on GCP to automate donor data queries, reducing stakeholder decision-making from hours to minutes."
3. Presents draft to user for approval
4. Validates (banned words, voice, length)
5. Writes to resume.md
6. Generates PDF

### Example 2: Tailor for Job Description

**User**: "Tailor my resume for this JD: [pastes Alma AI Engineer description]"

**Agent**:
1. Reads resume.md and the JD
2. Extracts JD keywords (e.g., "RAG", "LLM fine-tuning", "GCP", "Python")
3. Reframes bullets to emphasize matching experience
4. Reorders bullets to front-load relevant items
5. Presents proposed changes to user
6. Validates and generates PDF

### Example 3: Validate Only

**User**: "Check my resume for banned words and passive voice."

**Agent**:
1. Reads resume.md
2. Runs banned words check (Grep, case-insensitive)
3. Runs passive voice detection
4. Runs em dash and semicolon check
5. Reports findings with line numbers and suggestions
6. Does NOT modify resume.md or generate PDF
