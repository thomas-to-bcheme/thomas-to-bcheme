---
name: resume-tailor
description: Use when tailoring resume to a job description, updating resume.md, or generating a job-specific PDF
argument-hint: "[output PDF name, e.g. Thomas_To_Resume_MLE]"
---

# Resume Tailor Skill

Tailor `src/docs/resume.md` to a job description and generate a named PDF.

## Arguments

- `$ARGUMENTS` = output PDF filename (without `.pdf` extension). Example: `Thomas_To_Resume_MLE`
- If `$ARGUMENTS` is empty, prompt the user for the desired PDF name before proceeding.

## Workflow

### Step 1: Extract Job Description

Read the job description from the user's preceding message or referenced file in the conversation. If no job description is found, ask the user to provide one before continuing.

### Step 2: Read Current Resume

Read `src/docs/resume.md` to get the baseline resume content.

### Step 3: Delegate to Resume Agent

Use the `Task` tool with `subagent_type: resume` to tailor the resume. Pass these instructions to the agent:

```
You are tailoring a resume for a specific job description.

## Job Description
<paste the full JD text here>

## Current Resume
<paste the current src/docs/resume.md content here>

## Instructions
1. Read `src/docs/resume.md`
2. Reframe existing bullets to align with JD keywords and priorities
3. Reorder bullet points to front-load the most JD-relevant experience
4. Weave JD-specific terminology naturally into existing achievements
5. Preserve all factual content. Do NOT fabricate experience, metrics, or credentials
6. Preserve YAML frontmatter exactly as-is (pdf_options, stylesheet path)
7. Maintain single-page fit: 3500-4000 characters excluding YAML frontmatter
8. Follow the writing style from `.claude/agentic_kit/00_init/boilerplate_humanoid_speech.md`
9. Write the updated content back to `src/docs/resume.md`

## Bullet Format
`Action verb + context + impact + metric`

## Tense
- Current roles: present tense
- Prior roles: past tense

## Banned Words
can, may, just, that, very, really, literally, actually, certainly, probably, basically, could, maybe, delve, embark, enlightening, esteemed, shed light, craft, curating, imagine, realm, game-changer, unlock, discover, skyrocket, abyss, not alone, in a world where, revolutionize, disruptive, utilize, utilizing, dive deep, tapestry, illuminate, unveil, pivotal, intricate, elucidate, hence, furthermore, realm, however, harness, exciting, groundbreaking, cutting-edge, remarkable, it remains to be seen, glimpse into, navigating, landscape, stark, testament, in summary, in conclusion, moreover, boost, skyrocketing, opened up, powerful, inquiries, ever-evolving

## Formatting Rules
- No em dashes. Use commas, periods, or other standard punctuation only
- No semicolons
- No asterisks
- Active voice only ("Deployed" not "Was deployed")
- Start bullets with strong action verbs
- Include quantifiable metrics where they already exist
```

### Step 4: Validate Output

After the resume agent finishes, read the updated `src/docs/resume.md` and verify:

1. **No banned words** - Grep for each banned word in the file
2. **Active voice** - No passive constructions ("was deployed", "were implemented")
3. **No em dashes** - Search for `\u2014` and `--`
4. **No semicolons** - Search for `;`
5. **Character budget** - Count characters excluding YAML frontmatter; must be 3500-4000 chars
6. **YAML frontmatter unchanged** - Compare frontmatter block against the original
7. **No fabricated content** - Flag any bullets that appear to contain experience not in the original

If validation fails, delegate back to the resume agent with specific fix instructions. Do not attempt manual fixes.

### Step 5: Generate PDF

Run the PDF generation script:

```bash
npx tsx scripts/resume-pdf.ts --output $ARGUMENTS
```

If `$ARGUMENTS` was not provided, use the default name `Thomas_To_Resume`.

### Step 6: Report Results

Summarize to the user:
- Key changes made (which bullets were reframed, keywords added)
- Character count of the body content
- PDF output location
- Any validation warnings

## Key References

| Resource | Path |
|----------|------|
| Resume agent | `.claude/agents/resume.md` |
| Resume source | `src/docs/resume.md` |
| Resume CSS | `src/docs/resume-style.css` (read-only) |
| PDF script | `scripts/resume-pdf.ts` |
| Writing style | `.claude/agentic_kit/00_init/boilerplate_humanoid_speech.md` |

## Boundaries

- Does NOT modify `resume-style.css`
- Does NOT push to git or auto-commit
- Does NOT fabricate experience, metrics, or credentials
- Does NOT change YAML frontmatter (pdf_options, stylesheet path)
- Escalates to user if content changes alter the factual record
