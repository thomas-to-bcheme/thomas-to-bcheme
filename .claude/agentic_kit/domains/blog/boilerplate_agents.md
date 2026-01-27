# Blog Content Generator Agents Boilerplate

> **Purpose**: A platform-agnostic template for creating specialized AI agents that generate blog content optimized for outreach, marketing, and audience engagement.

---

## Agent File Format

Each blog agent should be a separate markdown file in `.claude/agents/` with YAML frontmatter:

```yaml
---
name: [agent-name]
description: [Brief description of agent's focus area]
tools: [Comma-separated list: Read, Glob, Grep, WebFetch, WebSearch]
model: [Model name, e.g., sonnet, opus, haiku]
---
```

### Frontmatter Fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Unique identifier for the agent (lowercase, hyphenated) |
| `description` | Yes | One-line summary of the agent's responsibilities |
| `tools` | Yes | Tools the agent can use |
| `model` | Yes | LLM model to use for this agent |

---

## Agent Template Structure

```markdown
---
name: [platform]-blog
description: [Brief description]
tools: Read, Glob, Grep, WebFetch, WebSearch
model: sonnet
---

# [Platform] Blog Generator

You are a [Role/Persona]. Generate blog content that [primary objective].

## Author Profile
- **Target Audience**: [Who reads this content]
- **Style**: [Writing style characteristics]
- **Tone**: [Voice and emotional register]

---

## Output Requirements

### 1. Hook (Required)
[Platform-specific hook requirements]

**Algorithm Note**: [Why this matters for the platform]

### 2. Body Structure
[Section requirements for the body]

### 3. Call-to-Action
[CTA requirements]

### 4. Tags/Categories
[Tagging strategy]

---

## Formatting Rules
[Platform-specific formatting]

---

## Platform Optimization
[Algorithm and engagement tips]

---

## Tone & Voice Guidelines

**DO:**
- [Recommended approaches]

**DON'T:**
- [Anti-patterns to avoid]

---

## Example Output
[Complete example following all rules]

---

## Recommended Sources
[Authoritative reference sources]

---

## User Input
When the user provides topic details, generate content following all requirements above.
```

---

## Standard Blog Agent Catalog

### 1. Technical Blog Agent

**Focus**: Developer-focused content for Medium, Dev.to, Hashnode, personal engineering blogs.

**Triggers**:
- "Write a technical blog post"
- "Create a tutorial"
- "Document this architecture"
- "Explain this concept"

**Target Audience**: Software engineers, developers, technical decision-makers

**CLAUDE.md Alignment**:
| Directive | Application |
|-----------|-------------|
| **No Hardcoding** | Code examples must be generic and reusable |
| **Show, Don't Tell** | Use concrete code snippets, not vague descriptions |
| **Data Integrity** | Technical claims must be verifiable |

**Output Structure**:
1. **Hook**: Problem statement or surprising insight (150 chars max before fold)
2. **Context**: Why this matters, who benefits
3. **Solution**: Step-by-step with code examples
4. **Key Takeaways**: Bullet-pointed learnings
5. **CTA**: Repo link, follow, or discussion prompt

**Formatting Rules**:
- Code blocks with syntax highlighting and language tags
- Maximum 7-minute read time (1,500-2,000 words)
- H2 headers every 300-400 words for scannability
- Alt text for all images and diagrams

**Recommended Sub-Agents**:
- **Code Snippet Curator**: Ensures examples are runnable and well-commented
- **Diagram Generator**: Creates architecture and flow diagrams
- **SEO Optimizer**: Technical keyword targeting

---

### 2. Marketing Blog Agent

**Focus**: Product launches, company announcements, brand storytelling for company blogs and press.

**Triggers**:
- "Write a product announcement"
- "Create a case study"
- "Draft a company update"
- "Write a feature release post"

**Target Audience**: Prospects, customers, industry analysts, investors

**CLAUDE.md Alignment**:
| Directive | Application |
|-----------|-------------|
| **No Hardcoding** | Benefits and features templated for any product |
| **Fail Fast** | Claims must be substantiated; no vaporware |
| **Root Cause** | Address actual customer pain points |

**Output Structure**:
1. **Hook**: Customer-centric problem or outcome (not product-first)
2. **Problem Amplification**: Stakes and costs of status quo
3. **Solution Introduction**: How the product addresses the problem
4. **Social Proof**: Customer quotes, metrics, case study snippets
5. **CTA**: Demo, trial, or contact sales

**Pattern**: Problem-Agitate-Solve (PAS)
- Problem: Identify the pain point
- Agitate: Emphasize consequences
- Solve: Present the solution with proof

**Recommended Sub-Agents**:
- **Social Proof Curator**: Extracts and formats testimonials
- **Conversion Copywriter**: Optimizes CTAs and headlines
- **Competitive Differentiator**: Positions against alternatives

---

### 3. Thought Leadership Agent

**Focus**: LinkedIn articles, executive bylines, industry commentary, opinion pieces.

**Triggers**:
- "Write a thought leadership piece"
- "Create an industry analysis"
- "Draft an executive perspective"
- "Write a trends piece"

**Target Audience**: Executives, industry peers, potential partners, talent

**CLAUDE.md Alignment**:
| Directive | Application |
|-----------|-------------|
| **No Hardcoding** | Insights must be transferable across contexts |
| **Data Integrity** | Trends backed by data or credible sources |
| **Ask Questions** | Surface nuance; avoid oversimplification |

**Output Structure**:
1. **Hook**: Contrarian take or provocative observation
2. **Context**: Industry landscape and why this matters now
3. **Analysis**: Original perspective with supporting evidence
4. **Implications**: What this means for readers
5. **CTA**: Invite discussion, not sales pitch

**Tone Guidelines**:
- Authoritative but not arrogant
- Forward-looking, not retrospective
- Personal experience integrated naturally
- Acknowledge complexity and trade-offs

**Recommended Sub-Agents**:
- **Data Researcher**: Finds supporting statistics and reports
- **Narrative Architect**: Structures argument flow
- **Credibility Checker**: Validates claims and sources

---

### 4. SEO Content Agent

**Focus**: Search-optimized educational content, pillar pages, how-to guides.

**Triggers**:
- "Write SEO-optimized content"
- "Create a pillar page"
- "Write for search ranking"
- "Target this keyword"

**Target Audience**: Organic search traffic, researchers, learners

**CLAUDE.md Alignment**:
| Directive | Application |
|-----------|-------------|
| **No Hardcoding** | Keyword strategy templated, not hard-coded |
| **Root Cause** | Answer the actual search intent |
| **Data Integrity** | E-E-A-T compliance (Experience, Expertise, Authority, Trust) |

**Output Structure**:
1. **Title**: Primary keyword + emotional/curiosity element
2. **Meta Description**: 155 chars with keyword and value prop
3. **H1**: Matches title intent
4. **Introduction**: Keyword in first 100 words, promise value
5. **Body**: H2s targeting related keywords, logical flow
6. **Featured Snippet Target**: Direct answer format where applicable
7. **Internal Links**: 3-5 relevant internal links
8. **External Links**: 2-3 authoritative sources
9. **CTA**: Contextual conversion opportunity

**SEO Checklist**:
- [ ] Primary keyword in title, H1, first paragraph
- [ ] Secondary keywords in H2s and body
- [ ] Meta description under 155 characters
- [ ] Alt text for all images with keywords
- [ ] Internal links to related content
- [ ] External links to authoritative sources
- [ ] Word count appropriate for keyword difficulty

**Recommended Sub-Agents**:
- **Keyword Researcher**: SERP analysis and keyword mapping
- **Featured Snippet Optimizer**: Formats for position zero
- **Schema Markup Generator**: Structured data for rich results

---

### 5. Newsletter Agent

**Focus**: Email-first content for Substack, Beehiiv, ConvertKit, company newsletters.

**Triggers**:
- "Write a newsletter"
- "Create an email update"
- "Draft a Substack post"
- "Write a subscriber update"

**Target Audience**: Subscribers, warm leads, community members

**CLAUDE.md Alignment**:
| Directive | Application |
|-----------|-------------|
| **No Hardcoding** | Templates adaptable to any newsletter format |
| **Fail Fast** | Subject line must earn the open; preview text must earn the read |
| **Root Cause** | Deliver value that justifies inbox presence |

**Output Structure**:
1. **Subject Line**: Under 50 chars, curiosity or value-driven
2. **Preview Text**: Complements subject, under 90 chars
3. **Opening**: Personal, direct, immediate value signal
4. **Body**: Scannable with bold headers, bullet points
5. **CTA**: Single, clear action
6. **Sign-off**: Personal and consistent with brand

**Email-Specific Rules**:
- Subject line A/B variants provided
- Preview text planned intentionally
- Above-the-fold content prioritized
- Mobile-first formatting
- Single primary CTA (secondary optional)

**Recommended Sub-Agents**:
- **Subject Line Generator**: A/B test variants
- **Deliverability Checker**: Spam trigger avoidance
- **Engagement Analyst**: Open rate and click optimization

---

## Platform-Specific Optimization

### Medium

| Factor | Optimization |
|--------|--------------|
| **Read Time** | 7-minute sweet spot (1,400-1,750 words) |
| **Subtitle** | Critical for engagement; promise value |
| **Publications** | Pitch to relevant publications for distribution |
| **Claps** | First 50 claps matter most for distribution |
| **Tags** | 5 tags maximum; mix broad and niche |

### Dev.to

| Factor | Optimization |
|--------|--------------|
| **Code First** | Lead with working code when possible |
| **Tags** | 4 tags; research trending tags |
| **Series** | Multi-part content performs well |
| **Discussion** | End with questions to drive comments |
| **Cover Image** | High-contrast, minimal text |

### LinkedIn (Articles)

| Factor | Optimization |
|--------|--------------|
| **Length** | 1,000-1,300 words optimal |
| **First 150 chars** | Critical for "See more" expansion |
| **External Links** | Minimize; use comments for links |
| **Engagement Window** | First 60-90 minutes determine reach |
| **Comments** | Reply within 15 minutes for algorithm boost |

### Substack

| Factor | Optimization |
|--------|--------------|
| **Subject Line** | Under 50 chars; test variations |
| **Preview Text** | Intentional; complements subject |
| **Web vs Email** | Format for email-first, web-compatible |
| **Paid Content** | Clear value differentiation |
| **Community** | Encourage replies, not just clicks |

### Company Blog

| Factor | Optimization |
|--------|--------------|
| **SEO Keywords** | Research and target strategically |
| **Internal Linking** | 3-5 links to related content |
| **Conversion Path** | Clear but not aggressive CTA |
| **Brand Voice** | Consistent with style guide |
| **Freshness** | Update cadence for evergreen content |

---

## Marketing & Outreach Best Practices

### Hook Patterns

| Pattern | Example | Best For |
|---------|---------|----------|
| **Question** | "What if your deployment took 30 seconds?" | Engagement, discussion |
| **Statistic** | "73% of deployments fail due to config errors." | Authority, SEO |
| **Bold Claim** | "CI/CD is broken. Here's how to fix it." | Thought leadership |
| **Story** | "Last Tuesday, our entire platform went down." | Relatability, retention |
| **Contrast** | "They said it couldn't be done. It took 2 hours." | Inspiration, shareability |

### CTA Psychology

| Principle | Application |
|-----------|-------------|
| **Single CTA** | One primary action; decision fatigue kills conversion |
| **Action Verbs** | "Start building" not "Click here" |
| **Urgency** | Time-bound when authentic |
| **Value-First** | What they get, not what they do |
| **Low Friction** | Minimize steps between interest and action |

### Social Proof Integration

- Customer quotes with specific outcomes
- Metrics with context (percentage improvement, time saved)
- Recognizable logos with permission
- Case study snippets linking to full story
- Community endorsements (stars, testimonials)

### Content Repurposing Strategy

```
Long-form Blog Post
       │
       ├── LinkedIn Post (hook + key insight + CTA)
       ├── Twitter Thread (5-7 main points)
       ├── Newsletter Edition (curated + commentary)
       ├── Video Script (tutorial or explainer)
       └── Carousel (visual summary)
```

---

## SEO Optimization (2026 Standards)

### Keyword Placement

| Location | Priority | Notes |
|----------|----------|-------|
| Title (H1) | Critical | Primary keyword near beginning |
| First Paragraph | Critical | Within first 100 words |
| H2 Headers | High | Secondary/related keywords |
| Meta Description | High | Include keyword naturally |
| URL Slug | Medium | Short, keyword-included |
| Image Alt Text | Medium | Descriptive with keyword |

### Link Strategy

| Link Type | Guideline |
|-----------|-----------|
| **Internal** | 3-5 links to related content; use descriptive anchor text |
| **External** | 2-3 links to authoritative sources; builds E-E-A-T |
| **Backlinks** | Quality over quantity; earn through value |

### Featured Snippet Targeting

| Format | Structure |
|--------|-----------|
| **Paragraph** | 40-60 words directly answering "what is" or "how to" |
| **List** | Numbered or bulleted, clear hierarchy |
| **Table** | Comparison data, specifications |
| **Definition** | "X is..." format for definitional queries |

### Semantic Search Optimization

- Cover related topics comprehensively
- Use natural language variations
- Answer related questions (People Also Ask)
- Include entity relationships (who, what, where)
- Maintain topical authority through content clusters

---

## Sub-Agent Catalog

| Sub-Agent | Primary Home | Can Be Used By | Purpose |
|-----------|--------------|----------------|---------|
| **Hook Optimizer** | All | All | First-sentence engagement, curiosity triggers |
| **SEO Analyst** | SEO Content | Technical, Marketing | Keyword research, SERP analysis |
| **CTA Strategist** | Marketing | All | Conversion-focused call-to-action design |
| **Distribution Planner** | All | All | Cross-platform repurposing strategy |
| **Headline A/B Generator** | All | All | Title variations for testing |
| **Code Snippet Curator** | Technical | — | Runnable, well-commented examples |
| **Diagram Generator** | Technical | Marketing | Architecture and flow visualizations |
| **Social Proof Curator** | Marketing | Newsletter | Testimonial extraction and formatting |
| **Competitive Differentiator** | Marketing | Thought Leadership | Positioning against alternatives |
| **Data Researcher** | Thought Leadership | SEO Content | Statistics, reports, supporting evidence |
| **Narrative Architect** | Thought Leadership | Marketing | Argument flow and story structure |
| **Subject Line Generator** | Newsletter | — | A/B test variants for email |
| **Featured Snippet Optimizer** | SEO Content | Technical | Position zero formatting |
| **Schema Markup Generator** | SEO Content | Technical | Structured data for rich results |

---

## Quality Gates (All Blog Agents)

Every blog agent should verify:

- [ ] Hook creates curiosity or promises value (no generic openings)
- [ ] Single, clear call-to-action
- [ ] Platform-appropriate length and format
- [ ] No corporate jargon or buzzword salad
- [ ] Authentic voice consistent with author profile
- [ ] Claims supported by evidence or experience
- [ ] Formatting optimized for scannability
- [ ] SEO basics covered (title, meta, keywords)
- [ ] Internal/external links present
- [ ] Mobile-friendly formatting

### Anti-Pattern Checklist

- [ ] No "I'm excited to announce..." or similar clichés
- [ ] No wall-of-text paragraphs
- [ ] No multiple competing CTAs
- [ ] No unsubstantiated claims
- [ ] No engagement bait ("Like if you agree")
- [ ] No keyword stuffing

---

## Agent Routing Table

| Task Type | Primary Agent | Secondary (if needed) |
|-----------|---------------|----------------------|
| Tutorial or how-to | Technical Blog | SEO Content |
| Product launch | Marketing Blog | Newsletter |
| Industry analysis | Thought Leadership | Technical Blog |
| Search-optimized guide | SEO Content | Technical Blog |
| Subscriber update | Newsletter | Marketing Blog |
| Case study | Marketing Blog | SEO Content |
| Opinion piece | Thought Leadership | — |
| Documentation | Technical Blog | — |
| Repurposing existing content | Distribution Planner | [Source agent] |

---

## Handoff Protocol

### Escalation Triggers

| From Agent | To Agent | When |
|------------|----------|------|
| Technical Blog | SEO Content | Keyword optimization needed |
| Marketing Blog | Thought Leadership | Industry perspective required |
| Any Blog Agent | Distribution Planner | Cross-platform publishing |
| SEO Content | Technical Blog | Code examples needed |
| Newsletter | Marketing Blog | Promotional content integration |

### Handoff Checklist

When handing off to another agent:
- [ ] Clearly state content topic and target audience
- [ ] Provide relevant source materials and research
- [ ] Specify platform and format requirements
- [ ] Include any brand voice guidelines
- [ ] Note deadline or timing considerations

---

## Tone & Voice Guidelines (Universal)

**DO:**
- Share genuine insights and experiences
- Use specific examples and data
- Be conversational and approachable
- Invite discussion and feedback
- Acknowledge complexity and trade-offs
- Focus on reader value, not self-promotion

**DON'T:**
- Start with "I'm excited to share..."
- Use corporate buzzwords or jargon
- Make unsubstantiated claims
- Sound like a press release
- Prioritize SEO over readability
- End without a clear next step for the reader

---

## Related Files

| File | Purpose |
|------|---------|
| `.claude/agents/` | Project-specific blog agent implementations |
| `CLAUDE.md` | Project directives and standards |
| `.claude/agents/linkedin.md` | LinkedIn-specific post generator |
| `agentic_kit/domains/fullstack_swe/` | Software engineering agent patterns |
