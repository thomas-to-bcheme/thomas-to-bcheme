---
name: resume-tailor
description: Use when tailoring resume to a job description, updating resume.md, or generating a job-specific PDF
argument-hint: "[output PDF name, e.g. Thomas_To_Resume_MLE]"
---

# Resume Tailor Skill

Read `src/docs/resume.md` as a READ-ONLY golden dataset, tailor content to a job description, and generate a named PDF. The golden dataset is NEVER modified.

## Arguments

- `$ARGUMENTS` = output filename (without extension). Example: `Thomas_To_Resume_MLE`
- If `$ARGUMENTS` is empty, prompt the user for the desired output name before proceeding.

## Workflow

### Step 1: Load Writing Standards

Read `.claude/agentic_kit/00_init/boilerplate_humanoid_speech.md` as the writing style reference. All generated text must comply with these rules.

### Step 2: Extract Job Description (URL + Text Support)

1. Check if the user provided a URL in their message or arguments (look for `https://` or `http://` patterns)
2. If URL found: use `WebFetch` tool to retrieve the page content, then extract the job description text from the fetched content
3. If WebFetch fails (403, timeout, JS-rendered page): inform the user the URL could not be fetched and ask them to paste the job description text directly
4. If no URL found: look for job description text in the user's preceding message or referenced file
5. If no job description found: ask the user to provide one before continuing

### Step 3: Read Golden Dataset as READ-ONLY

Read `src/docs/resume.md` to get the full professional history (~9274 chars, multi-page). Store the content for passing to the resume agent.

**DO NOT modify `src/docs/resume.md` under any circumstances.**

### Step 4: Delegate to Resume Agent

Use the `Agent` tool with `subagent_type: resume` to tailor the resume. Pass these instructions to the agent:

```
You are tailoring a resume for a specific job description.

## Job Description
<paste the full JD text here>

## Golden Dataset (READ-ONLY source material)
<paste the full src/docs/resume.md content here>

## Output File
Write the tailored resume to: {PROJECT_ROOT}/$ARGUMENTS.md

## Instructions
1. Read `.claude/agentic_kit/00_init/boilerplate_humanoid_speech.md` and enforce all writing rules
2. Select the 3-4 most relevant roles and 2-3 strongest bullets per role from the golden dataset
3. Reframe selected bullets using the XYZ formula (mandatory)
4. Reorder bullet points to front-load the most JD-relevant experience
5. Weave JD-specific terminology into the Z (methods) component of each XYZ bullet
6. Preserve all factual content. Do NOT fabricate experience, metrics, or credentials
7. Maintain single-page fit: 3500-4000 characters
8. Write the tailored content to {PROJECT_ROOT}/$ARGUMENTS.md using the Write tool
9. NEVER modify src/docs/resume.md. You are writing a NEW file only

## XYZ Bullet Formula (mandatory)
Every bullet MUST follow: "Accomplished [X] as measured by [Y], by doing [Z]"
- X = result/accomplishment
- Y = metric/percentage/data point
- Z = actions/skills/methods (weave JD keywords here)
- Start with strong action verbs
- Quantify everything: revenue, time saved, error rates, cost reduced

## ATS Section Rules
Only these H2 headers are permitted:
- PROFESSIONAL SUMMARY
- TECHNICAL SKILLS
- PROFESSIONAL EXPERIENCE
- EDUCATION
No H3 sub-headers within sections. Front-load JD keywords into PROFESSIONAL SUMMARY and first 2 bullets per role.

## Tense
- Current roles: present tense
- Prior roles: past tense

## Banned Words
can, may, just, that, very, really, literally, actually, certainly, probably, basically, could, maybe, delve, embark, enlightening, esteemed, shed light, craft, curating, imagine, realm, game-changer, unlock, discover, skyrocket, abyss, not alone, in a world where, revolutionize, disruptive, utilize, utilizing, dive deep, tapestry, illuminate, unveil, pivotal, intricate, elucidate, hence, furthermore, realm, however, harness, exciting, groundbreaking, cutting-edge, remarkable, it remains to be seen, glimpse into, navigating, landscape, stark, testament, in summary, in conclusion, moreover, boost, skyrocketing, opened up, powerful, inquiries, ever-evolving

## Formatting Rules
- No em dashes. Use commas, periods, or other standard punctuation only
- No semicolons
- No asterisks in output text
- Active voice only ("Deployed" not "Was deployed")
```

### Step 5: Validate the Generated File

After the resume agent finishes, validate the tailored resume (NOT `src/docs/resume.md`):

```bash
python3 scripts/resume_pdf.py --validate-only --input $ARGUMENTS.md
```

If validation fails, delegate back to the resume agent with specific fix instructions. Do not attempt manual fixes.

### Step 6: Generate PDF from the Generated File

```bash
python3 scripts/resume_pdf.py --input $ARGUMENTS.md --output $ARGUMENTS
```

If `$ARGUMENTS` was not provided, use the default name `Thomas_To_Resume`.

### Step 7: Report Results

Summarize to the user:
- JD source (URL fetched or pasted text)
- Key changes made (which roles selected, keywords added)
- Character count of the body content
- Output files: `$ARGUMENTS.md` and `$ARGUMENTS.pdf`
- Any validation warnings
- Confirm `src/docs/resume.md` was NOT modified

## Key References

| Resource | Path | Access |
|----------|------|--------|
| Golden dataset | `src/docs/resume.md` | **READ-ONLY** |
| Resume agent | `.claude/agents/resume.md` | Delegated |
| PDF script | `scripts/resume_pdf.py` | Execute |
| Writing style | `.claude/agentic_kit/00_init/boilerplate_humanoid_speech.md` | READ-ONLY |
| Generated markdown | `{PROJECT_ROOT}/$ARGUMENTS.md` | WRITE (new) |
| Generated PDF | `{PROJECT_ROOT}/$ARGUMENTS.pdf` | WRITE (new) |

## Boundaries

- Does NOT push to git or auto-commit
- Does NOT fabricate experience, metrics, or credentials
- Does NOT modify `src/docs/resume.md` under any circumstances
- Escalates to user if content changes alter the factual record
- Batch-safe: each invocation reads the same immutable golden dataset and writes to independent output files
