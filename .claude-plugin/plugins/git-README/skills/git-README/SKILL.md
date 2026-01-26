---
name: git-README
description: Spawn 5 subagents to analyze codebase and smart-merge README.md
tools: Read, Glob, Grep, Task, Edit, Write
---

# /git-README - 5-Agent README Generator with Smart Merge

## Purpose
Spawn 5 subagents to comprehensively analyze the codebase and generate/update README.md following best practices. Uses a smart merge strategy to preserve existing valuable content while adding missing sections and updating outdated information.

## Architecture
- **4 Parallel Explore Agents**: Analyze different aspects of the codebase simultaneously
- **1 Review Coordinator Agent**: Synthesizes findings and generates the final draft
- **Orchestrator (You)**: Reviews draft and performs smart merge

---

## Workflow Steps

### Phase 1: Read Existing README

First, check if README.md exists and read its current content:

```bash
ls -la README.md 2>/dev/null || echo "No README.md found"
```

If README.md exists, use the Read tool to capture its current content. Store this for the smart merge phase.

---

### Phase 2: Launch 4 Parallel Explore Subagents

**CRITICAL**: You MUST use the Task tool to spawn all 4 Explore agents in a SINGLE message with multiple tool calls. This enables parallel execution.

Launch these 4 agents simultaneously using `subagent_type: Explore`:

#### Agent 1: Project Structure Analyzer
```
description: "Analyze project structure"
prompt: |
  Analyze the project structure for README documentation. Find and report:

  1. **Directory Layout**: Key folders and their purposes (src/, lib/, tests/, etc.)
  2. **Main Entry Points**: index files, main modules, application bootstraps
  3. **Tech Stack**: Languages, frameworks, libraries with versions from config files
  4. **Key Configuration Files**: package.json, tsconfig.json, pyproject.toml, etc.

  Search patterns to use:
  - package.json, requirements.txt, Cargo.toml, go.mod for dependencies
  - tsconfig.json, .eslintrc, prettier.config for tooling
  - Dockerfile, docker-compose.yml for containerization

  Return a structured markdown summary with:
  - Project type (web app, CLI, library, etc.)
  - Primary language and framework
  - Directory tree of important folders
  - List of key config files found
```

#### Agent 2: Features & Functionality Analyzer
```
description: "Analyze features and functionality"
prompt: |
  Identify main features for README documentation. Find and report:

  1. **Core Components/Modules**: What does each major module do?
  2. **API Endpoints**: Routes, methods, and their purposes (if applicable)
  3. **User-Facing Features**: What can users do with this project?
  4. **External Integrations**: APIs, services, databases connected

  Search patterns to use:
  - src/app/api/ or routes/ for API endpoints
  - src/components/ for UI components
  - src/services/ or lib/ for business logic
  - Look for comments, docstrings, and function names that indicate purpose

  Return a structured markdown summary with:
  - Bulleted list of key features
  - Brief description of main modules
  - API endpoint summary (if any)
  - External service integrations
```

#### Agent 3: Setup & Configuration Analyzer
```
description: "Analyze setup requirements"
prompt: |
  Analyze setup requirements for README documentation. Find and report:

  1. **Dependencies**: From package.json, requirements.txt, etc.
  2. **Environment Variables**: From .env.example, .env.template, or code references
  3. **Build & Run Commands**: Scripts in package.json, Makefile, etc.
  4. **Prerequisites**: Node version, Python version, system dependencies

  Search patterns to use:
  - .env.example, .env.template for env vars
  - package.json scripts section
  - Makefile, justfile for build commands
  - .nvmrc, .python-version for version requirements
  - README sections about installation (if exists)

  Return a structured markdown summary with:
  - Prerequisites list (with versions)
  - Step-by-step installation commands
  - Environment variables table (name, description, required/optional)
  - Build and run commands
```

#### Agent 4: Testing & CI/CD Analyzer
```
description: "Analyze testing and CI/CD"
prompt: |
  Analyze testing and CI/CD for README documentation. Find and report:

  1. **Test Frameworks**: Jest, pytest, vitest, etc.
  2. **CI/CD Pipelines**: GitHub Actions, GitLab CI, etc.
  3. **Code Quality Tools**: Linters, formatters, type checkers
  4. **Test Coverage**: Coverage configuration and thresholds

  Search patterns to use:
  - .github/workflows/ for GitHub Actions
  - jest.config.*, vitest.config.*, pytest.ini for test config
  - .eslintrc*, .prettierrc*, biome.json for linting
  - codecov.yml, .coveragerc for coverage

  Return a structured markdown summary with:
  - Test command to run tests
  - List of quality tools configured
  - CI/CD pipeline summary
  - Any badges that should be added (build status, coverage, etc.)
```

---

### Phase 3: Collect Analysis Results

Wait for all 4 Explore agents to complete. Each will return their findings as structured markdown. Aggregate all results before proceeding.

---

### Phase 4: Launch Review Coordinator (Agent 5)

After all 4 analyzers complete, launch a Plan subagent to synthesize the findings:

```
subagent_type: Plan
description: "Coordinate README synthesis"
prompt: |
  You are the README Review Coordinator. You have received analysis from 4 agents.

  ## Analysis Reports

  ### Agent 1 - Project Structure:
  [Insert Agent 1 results here]

  ### Agent 2 - Features & Functionality:
  [Insert Agent 2 results here]

  ### Agent 3 - Setup & Configuration:
  [Insert Agent 3 results here]

  ### Agent 4 - Testing & CI/CD:
  [Insert Agent 4 results here]

  ## Existing README Content:
  [Insert current README.md content here, or "No existing README" if none]

  ## Your Tasks:

  1. **Synthesize** all findings into a cohesive README structure
  2. **Compare** against existing README content
  3. **Identify** gaps, outdated info, missing sections, redundancies
  4. **Generate** a comprehensive README draft following best practices

  ## Required README Sections (in order):

  1. **Title & Description**: Project name with brief tagline
  2. **Badges**: Build status, version, license, etc.
  3. **Features**: Bulleted highlights
  4. **Tech Stack**: Table of technologies used
  5. **Prerequisites**: Required software and versions
  6. **Installation**: Step-by-step setup instructions
  7. **Usage**: How to run and use the project
  8. **Project Structure**: Directory tree with descriptions
  9. **Configuration**: Environment variables table
  10. **Testing**: How to run tests
  11. **Contributing**: Guidelines for contributors
  12. **License**: License information

  ## Smart Merge Recommendations:

  Provide explicit recommendations for each section:
  - **PRESERVE**: What to keep from existing README (custom content, links, etc.)
  - **ADD**: New sections that are missing
  - **UPDATE**: Outdated information that needs refreshing
  - **REMOVE**: Redundant or incorrect information

  Return your complete draft README and merge recommendations.
```

---

### Phase 5: Orchestrator Review

After Agent 5 returns its draft and recommendations:

1. Review the synthesized README draft
2. Validate that all sections are complete and accurate
3. Cross-reference with the agent analysis reports
4. Prepare the final content for smart merge

---

### Phase 6: Smart Merge & Update README.md

Apply the smart merge strategy:

**If README.md exists:**
- Use the Edit tool for targeted updates
- Preserve custom sections (e.g., Acknowledgments, Sponsors, custom badges)
- Update version numbers, commands, and technical details
- Add missing standard sections in the appropriate locations
- Maintain the user's formatting preferences where possible

**If no README.md exists:**
- Use the Write tool to create the complete README from the draft

**Smart Merge Rules:**
1. **Never delete** user-written custom sections
2. **Preserve** external links and references
3. **Update** technical details (versions, commands, dependencies)
4. **Add** missing standard sections
5. **Maintain** consistent heading levels (# for title, ## for sections)

---

### Phase 7: Confirm Success

Report the results to the user:

```
## README.md Update Complete

### Summary of Changes:
- **Preserved**: [list sections kept unchanged]
- **Added**: [list new sections]
- **Updated**: [list sections with changes]

### Sections in Final README:
1. Title & Description
2. Badges
3. Features
... etc.

### Review the changes:
The README.md has been updated. Please review and adjust any sections as needed.
```

---

## Error Handling

- **No source files found**: Report that the project appears empty
- **Agent timeout**: Report partial results and continue with available data
- **Write permission denied**: Report error and suggest checking file permissions
- **Conflicting information**: Prefer data from config files over inferred data

---

## Example Output

```
/git-README

Phase 1: Reading existing README... Found (234 lines)
Phase 2: Launching 4 parallel analyzers...
  - Agent 1 (Structure): Analyzing...
  - Agent 2 (Features): Analyzing...
  - Agent 3 (Setup): Analyzing...
  - Agent 4 (Testing): Analyzing...
Phase 3: Collecting results... All 4 agents complete
Phase 4: Launching Review Coordinator...
Phase 5: Reviewing draft...
Phase 6: Applying smart merge...
Phase 7: Complete!

## README.md Update Summary

### Preserved:
- Custom "Acknowledgments" section
- Sponsor badges and links
- Project logo

### Added:
- Tech Stack table
- Environment Variables table
- Project Structure tree

### Updated:
- Installation commands (npm -> pnpm)
- Node.js version (18 -> 20)
- Dependencies list

README.md has been updated successfully.
```
