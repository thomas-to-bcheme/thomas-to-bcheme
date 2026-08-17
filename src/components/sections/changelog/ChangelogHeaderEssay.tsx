import React from 'react';
import Link from 'next/link';
import { Quote } from 'lucide-react';
import SweCompassSection from '@/components/sections/changelog/SweCompassSection';
import SectionHeading from '@/components/ui/SectionHeading';

const PARAGRAPH_CLASS = 'text-sm sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed';
const STRONG_CLASS = 'font-bold text-zinc-900 dark:text-white';
const CODE_CLASS =
  'px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-[0.85em] font-mono';
const NOTE_CLASS =
  'text-xs italic text-zinc-400 dark:text-zinc-600 border-l-2 border-zinc-200 dark:border-zinc-800 pl-3';
const BULLET_CLASS =
  "text-sm sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed pl-4 relative before:content-['—'] before:absolute before:left-0 before:text-zinc-300 dark:before:text-zinc-700";

/**
 * Full inline essay establishing the portfolio's mental model — mission,
 * funnel/stakeholders, SWE Compass, agent definition, system-design
 * philosophy, and effective communication. The original five sections'
 * copy shipped verbatim from the approved plan (§4) — do not paraphrase or
 * shorten it, including the inline notes distinguishing newly-authored
 * synthesis from direct quotes.
 *
 * Five additions are deliberate, later exceptions to that rule, made by
 * explicit user decision outside the original §4 plan: the
 * business-driven-development paragraphs and "AI Growth & Adoption"
 * pull-quote appended to system-design-philosophy; the
 * benchmark-before-automating paragraphs appended immediately after that
 * pull-quote, in the same section; the prompt-engineering paragraphs
 * appended to agent-definition; the standalone effective-communication
 * section (plus the non-section mental-models-synthesis closing block after
 * it); and the standalone unintended-consequences section, inserted between
 * system-design-philosophy and effective-communication. Leave every original
 * section's pre-existing sentences untouched when editing any of the five.
 */
const ChangelogHeaderEssay = () => {
  return (
    <div className="space-y-16">
      {/* --- MISSION --- */}
      <section id="mission" className="scroll-mt-24">
        <SectionHeading eyebrow="Mental Model" title="Why this exists, and why it costs $0" />
        <div className="space-y-4">
          <p className={PARAGRAPH_CLASS}>
            This portfolio&apos;s mission is &quot;show, don&apos;t tell&quot;: instead of listing
            AI/ML engineering, data engineering, and agentic-methods skills on a résumé, it runs
            them, live, in production. A recruiter reading a bullet point about &quot;agentic
            AI&quot; has to take it on faith; a recruiter watching a real chat agent cite live
            Postgres numbers, a real GPU inference backend answer a request on Hugging Face&apos;s
            free ZeroGPU tier, or a real tailoring pipeline attach a PDF to an application is
            watching engineering happen.
          </p>
          <p className={PARAGRAPH_CLASS}>
            The constraint that makes that proof credible is that none of it costs anything to
            run, indefinitely. That&apos;s not a cost-cutting afterthought — it&apos;s the actual
            design requirement this whole platform is built against. Every layer runs on a free
            tier: GitHub is the data warehouse and logic engine (a GitHub Actions cron drives
            ingestion through a raw → staging → production lifecycle, with unlimited compute
            minutes on a public repo), Vercel is a thin presentation layer (Next.js 16, rendering
            pre-processed data rather than doing heavy compute), and Hugging Face is the inference
            engine (ZeroGPU today, Colab&apos;s free GPU/TPU tiers next). Staying inside those
            limits — Vercel&apos;s rolling 100-deploys/24h window, GitHub&apos;s once-a-day free
            cron cap, ZeroGPU&apos;s per-call time quota — is itself the engineering exercise, not
            a constraint worked around once and forgotten.
          </p>
          <p className={PARAGRAPH_CLASS}>
            That&apos;s also why this project treats AI/ML engineering and data engineering as one
            discipline rather than two: the Job Board&apos;s Neon Postgres pipeline, the
            résumé-tailoring agent, and this site&apos;s own RAG chat agent all move through the
            same shape — ingest real data, reason over it under a bounded compute budget, and
            serve the result — whether the compute is a GitHub Action, a Vercel function, or a
            Hugging Face Space. Agentic methods are the mechanism that makes that shape work
            end-to-end without a human in the loop for every step.
          </p>
        </div>
      </section>

      {/* --- FUNNEL --- */}
      <section id="funnel" className="scroll-mt-24">
        <SectionHeading
          eyebrow="Mental Model"
          title="The pipeline this site is the landing page for"
        />
        <div className="space-y-4">
          <p className={PARAGRAPH_CLASS}>
            Two channels feed the same funnel, and this site is the landing page for both.
          </p>
          <p className={PARAGRAPH_CLASS}>
            Outbound is résumé-first: the apply-to-jobs pipeline (see the Job Board section below)
            scrapes real postings, tailors a résumé per role through a bounded-concurrency Gemini
            pipeline, checks every draft against a golden-dataset QA rubric, and renders it to a
            PDF that gets attached directly to the application. That PDF is the artifact a
            recruiter or an ATS sees first — this site is where they land next, to verify the
            claims on it.
          </p>
          <p className={PARAGRAPH_CLASS}>
            Inbound is LinkedIn-first, and slower by design: the roadmap&apos;s content phase turns
            the same engineering arc — design decisions, trade-offs, lessons learned — into a
            YouTube and LinkedIn content stream, so the portfolio is discoverable by people who
            were never sent a résumé at all.
          </p>
          <p className={PARAGRAPH_CLASS}>
            Both channels converge on the same three stakeholders in a recruiting pipeline, and
            each reads this site differently:
          </p>
          <ul className="space-y-2">
            <li className={BULLET_CLASS}>
              <strong className={STRONG_CLASS}>Recruiters</strong> scan for role fit, availability,
              and work authorization fast — the résumé and the About Me section are built for that
              pass.
            </li>
            <li className={BULLET_CLASS}>
              <strong className={STRONG_CLASS}>Hiring managers</strong> want outcomes and judgment
              — the pipeline board, the roadmap phases, and this changelog&apos;s lessons-learned
              are aimed at that read.
            </li>
            <li className={BULLET_CLASS}>
              <strong className={STRONG_CLASS}>The technical team</strong> wants depth —
              architecture diagrams, real trade-offs, and, when they ask, a chat agent that can go
              as deep as the résumé itself allows without fabricating a number.
            </li>
          </ul>
          <p className={PARAGRAPH_CLASS}>
            The chat agent embedded on this site is built for exactly that range: instructed to
            answer &quot;professionally, accurately, and persuasively&quot; and to recommend
            contacting Thomas after every response, but also to reach for concrete tech-stack and
            engineering-depth detail the moment a technical question shows up — one agent has to
            satisfy a non-technical recruiter&apos;s first pass and a technical interviewer&apos;s
            follow-up, without switching tools.
          </p>
          <p className={NOTE_CLASS}>
            Flagged: this section is newly-authored synthesis of real, separately-documented facts
            — not a verbatim quote from any single existing file.
          </p>
        </div>
      </section>

      {/* --- SWE COMPASS --- */}
      <section id="swe-compass" className="scroll-mt-24">
        <SectionHeading eyebrow="Mental Model" title="The SWE Compass" />
        <SweCompassSection />
      </section>

      {/* --- AGENT DEFINITION --- */}
      <section id="agent-definition" className="scroll-mt-24">
        <SectionHeading eyebrow="Mental Model" title='What "agent" means on this site' />
        <div className="space-y-4">
          <p className={PARAGRAPH_CLASS}>
            &quot;Agent&quot; gets used loosely enough industry-wide that it&apos;s worth defining
            by mechanism instead of adjective. On this site, something only gets called an agent
            if it does all four of these, observably:
          </p>
          <ol className="space-y-3 list-decimal list-outside pl-5 marker:text-zinc-400 marker:font-bold">
            <li className={PARAGRAPH_CLASS}>
              <strong className={STRONG_CLASS}>It perceives real data.</strong> Not a hardcoded
              fixture — the apply-to-jobs pipeline scrapes live Apple and NVIDIA postings; this
              site&apos;s chat agent reads the actual résumé markdown and live Postgres pipeline
              counts at request time.
            </li>
            <li className={PARAGRAPH_CLASS}>
              <strong className={STRONG_CLASS}>
                It reasons under a bounded constraint, through an LLM.
              </strong>{' '}
              apply-to-jobs tailors a résumé per role through a bounded-concurrency Gemini pipeline
              with quota-vs-rate-limit-aware backoff — deciding, per call, whether a failure means
              &quot;back off&quot; or &quot;this model&apos;s daily quota is actually exhausted,
              fail over.&quot; The chat agent reasons over that same résumé under a fixed system
              prompt and a token budget, not an open-ended one.
            </li>
            <li className={PARAGRAPH_CLASS}>
              <strong className={STRONG_CLASS}>
                It acts — it produces a real, shippable artifact.
              </strong>{' '}
              apply-to-jobs&apos;s output is a rendered, uploaded PDF attached to a real
              application, not a suggestion a human has to rewrite. linkedin-content-loop and
              agentic-writer — both extracted into standalone open-source repos out of this same
              lineage — close a similar loop for content generation and LinkedIn posting
              automation.
            </li>
            <li className={PARAGRAPH_CLASS}>
              <strong className={STRONG_CLASS}>It gets checked before it ships.</strong> Every
              tailored résumé is auto-checked post-generation against a golden-dataset rubric —
              weak or missing quantifiable metrics, unsupported skill claims, missing hyperlinks,
              banned words, semicolons, a hard 2-page limit — before it&apos;s ever attached to an
              application. An agent that isn&apos;t checked before it acts isn&apos;t trusted
              enough to call one.
            </li>
          </ol>
          <p className={PARAGRAPH_CLASS}>
            By that bar, this site&apos;s chat widget is a <em>smaller</em> agent than
            apply-to-jobs — it perceives and reasons, but its &quot;action&quot; is a streamed
            answer, not a shipped artifact — and that&apos;s fine; the definition is about
            mechanism, not about which one is more impressive.
          </p>
          <p className={NOTE_CLASS}>
            Note the correction from the design pass: point 3 no longer asserts a specific
            internal &quot;draft → review → validate → publish → archive&quot; pipeline for
            agentic-writer/linkedin-content-loop — that detail isn&apos;t confirmed anywhere this
            repo can see. Point 4&apos;s rubric list restores &quot;semicolons&quot; to match{' '}
            <code className={CODE_CLASS}>GITHUB_CONTEXT</code> §7 exactly.
          </p>
          <p className={PARAGRAPH_CLASS}>
            <strong className={STRONG_CLASS}>
              Prompt engineering is the actual mechanism behind point 2
            </strong>{' '}
            — how the reasoning step above gets steered, not just that it happens. The default
            template used across this project&apos;s agents is deliberately simple: state the
            objective, the steps to complete it, at least one explicit constraint, and a known
            example where one exists — with the balance shifting toward more constraints as a
            task gets more consequential (a résumé rubric check is constraint-heavy; a chat
            agent&apos;s tone guidance is not).
          </p>
          <div id="agent-definition-prompt-engineering" className="scroll-mt-24 space-y-2">
            <p className={PARAGRAPH_CLASS}>
              Zero-shot prompting — intentional ambiguity, no worked example — is the right call
              when the goal is agentic creativity and flexibility: letting a model find its own
              path through an underspecified problem. Few-shot prompting, and more structured
              strategies like chain-of-thought or tree-of-thought, are the right call for
              deterministic, workflow-shaped tasks, where the intent is a specific, repeatable
              outcome, not a flexible one. Choosing between them is itself part of the design:
              apply-to-jobs&apos; résumé-tailoring pipeline needs a deterministic, rubric-checked
              output, so it leans on few-shot examples and explicit constraints; this site&apos;s
              chat agent has to handle an open set of recruiter questions, so its prompt leaves
              more room for zero-shot reasoning inside a bounded system prompt. See{' '}
              <a
                href="https://cloud.google.com/discover/what-is-prompt-engineering?hl=en#prompt-engineering-overview-and-guide"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                Google Cloud&apos;s prompt-engineering guide
              </a>{' '}
              for the underlying strategies.
            </p>
          </div>
        </div>
      </section>

      {/* --- SYSTEM DESIGN PHILOSOPHY --- */}
      <section id="system-design-philosophy" className="scroll-mt-24">
        <SectionHeading
          eyebrow="Mental Model"
          title="Reliability, maintainability, adaptability, resilience — not just CAP theorem, and not just for its own sake"
        />
        <div className="space-y-4">
          <p className={PARAGRAPH_CLASS}>
            CAP theorem is the textbook reflex the moment &quot;distributed systems&quot; comes up:
            pick two of consistency, availability, and partition tolerance. It&apos;s not wrong,
            but it&apos;s the wrong first question for a system whose binding constraint isn&apos;t
            a distributed-consensus trade-off — it&apos;s a $0 budget. That budget rules out an
            entire axis CAP doesn&apos;t talk about: this system cannot vertically scale its way
            out of a problem. There&apos;s no bigger Vercel plan, no bigger compute instance, no
            upgrade path that costs money, by design. So the axes that actually drive design
            decisions here are <strong className={STRONG_CLASS}>reliability</strong>,{' '}
            <strong className={STRONG_CLASS}>maintainability</strong>,{' '}
            <strong className={STRONG_CLASS}>adaptability</strong>, and{' '}
            <strong className={STRONG_CLASS}>resilience</strong> — and the concrete recommendation
            that falls out of that constraint is to scale horizontally, by partitioning work across
            several free-tier providers, rather than vertically within any one of them.
          </p>
          <p className={PARAGRAPH_CLASS}>
            That four-axis list isn&apos;t invented from scratch — it&apos;s a deliberate
            adaptation of Chip Huyen&apos;s canonical four characteristics of a well-designed
            system: reliability, scalability, maintainability, and adaptability, from{' '}
            <a
              href="https://github.com/chiphuyen/dmls-book"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              Designing Machine Learning Systems
            </a>{' '}
            (O&apos;Reilly, 2022). Three of her four carry over here unchanged: reliability,
            maintainability, adaptability. The fourth — scalability — is deliberately swapped for
            resilience, and not as a hedge: a system that structurally cannot vertically scale (the
            $0-budget constraint named above) doesn&apos;t get to claim scalability as a real,
            honest axis of its own design. What it can still be judged on is whether it survives a
            provider outage or a policy change without going down, which is what resilience
            measures here. Textbook version: reliability, scalability, maintainability,
            adaptability. Applied version: reliability, maintainability, adaptability, resilience.
            The swap isn&apos;t an oversight — it&apos;s the constraint talking.
          </p>
          <p className={PARAGRAPH_CLASS}>
            That&apos;s what the &quot;GitHub Monolith&quot; architecture actually is: GitHub does
            the ETL/compute (a public repo gets unlimited CI minutes and a full, multi-hour-runtime
            VM per job, not a serverless function&apos;s 10–60 second cap), Vercel does the thin
            presentation layer (built to receive pre-processed data, not to compute it), and
            Hugging Face does inference (offloaded so it never competes with the page&apos;s own
            budget). Each provider&apos;s free-tier limit resets on its own schedule — Vercel on a
            rolling 24-hour/30-day window, GitHub on a fixed monthly billing date — and the
            &quot;Vercel-Pinger&quot; pattern (a GitHub Action cron commits data, and that commit
            itself triggers a Vercel deploy) exists specifically to route around Vercel&apos;s
            free-tier cron cap without paying for a better one. The system-design docs calculate a
            concrete safe operating point from this: at 100 deploys/24h with a 20% buffer reserved
            for manual hotfixes, hourly automation (24 deploys/day) is the recommended safe maximum
            — going past roughly 15-minute intervals risks a lockout window that neither more money
            nor more cleverness gets you out of early. As the roadmap docs put it, this &quot;Code
            Monolith&quot; architecture hosted on GitHub exists to guarantee infrastructure
            resilience — the same codebase can redeploy to Hugging Face, Vercel, AWS, or GCP, so no
            single provider&apos;s outage or policy change is a single point of failure for the
            whole system.
          </p>
          <p className={PARAGRAPH_CLASS}>
            The lessons-learned entries in this changelog are what reliability and resilience look
            like in practice here, not abstractions. The Job Board&apos;s schema-drift bug — a{' '}
            <code className={CODE_CLASS}>posted_date</code> column that changed type out from under
            a live read path — is a maintainability failure: two services (a writer and a reader)
            drifted out of shared understanding of a schema neither one fully owned. The ZeroGPU
            402 paid-tier-gate bug is an adaptability failure: even a &quot;free&quot; tier hides
            paid-tier assumptions inside its own API surface, and the fix was adapting the deploy
            path around a constraint that wasn&apos;t documented anywhere. The CSS theme-cascade
            bug that shipped unreadable text to a production page that built cleanly locally is a
            reliability gap in verification, not in code — it only surfaced by checking the actual
            deployed page. None of these are CAP-theorem trade-offs; they&apos;re the four axes
            above, showing up as real incidents, at zero infrastructure cost, on a system built to
            survive them without a bigger budget to fall back on.
          </p>
          <p className={PARAGRAPH_CLASS}>
            <strong className={STRONG_CLASS}>Business-driven, not academic.</strong> None of the
            axes above — reliability, maintainability, adaptability, resilience — are chosen
            because they sound better in a systems-design interview than &quot;pick two of
            three.&quot; They&apos;re the axes that matter here because this project runs against
            a rubric borrowed from business, not research: does a design decision drive revenue,
            reduce risk, save time, or streamline a process? A vertically-scaled, paid Postgres
            tier doesn&apos;t do any of those four things better than the current $0 architecture
            does — it just spends money to be marginally more elegant, which is optimizing for
            the wrong thing. It&apos;s the same rubric that makes the schema-drift, 402-gate, and
            CSS-cascade bugs above worth writing up at all: each one cost real time to diagnose,
            and documenting the fix is what keeps the next incident from costing that same time
            twice. Technology chosen for its own sake — because it&apos;s new, or because a
            textbook covers it — is research. Technology chosen because it moves one of those four
            levers is engineering.
          </p>
          <div
            id="system-design-philosophy-ai-growth-adoption"
            className="scroll-mt-24 rounded-xl border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-900/10 p-5 sm:p-6"
          >
            <span className="flex items-center gap-1.5 text-micro font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-3">
              <Quote size={12} className="stroke-[2.5]" /> AI Growth &amp; Adoption
            </span>
            <p className={PARAGRAPH_CLASS + ' mb-3'}>
              The same rubric applies one level up, before a system is even worth scaling: its
              users have to be scaled onto it first.
            </p>
            <blockquote className="text-sm sm:text-base italic text-emerald-900 dark:text-emerald-200 leading-relaxed border-l-2 border-emerald-300 dark:border-emerald-700 pl-4">
              &quot;You can design this amazing technology that can support 1M users, but from
              grassroots, if your users are afraid of the technology, then what&apos;s the point in
              designing a system that can scale to 1M users when you don&apos;t have that many
              users?&quot;
            </blockquote>
            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mt-3">
              — Thomas To
            </p>
          </div>
          <p className={PARAGRAPH_CLASS}>
            The lesson generalizes past any one system: scale is a hypothesis until real users
            adopt it, and grassroots trust is earned before headroom is spent building for a user
            count that may never show up. That&apos;s why this site treats adoption — a résumé PDF
            a recruiter actually opens, a chat agent a hiring manager actually trusts enough to ask
            a follow-up question — as the metric that comes before throughput, not after it.
          </p>
          <p className={PARAGRAPH_CLASS}>
            <strong className={STRONG_CLASS}>
              Benchmark the existing process before automating it, not after.
            </strong>{' '}
            Any operational process improvement that replaces a manually-run workflow with an
            automated one starts by measuring the process as it already performs — cost, turnaround
            time, error rate — before a line of automation code exists, so the &quot;after&quot;
            number has a real &quot;before&quot; to be checked against. Skip that step and the risk
            isn&apos;t just a worse process; it&apos;s a process nobody can prove is better, which
            is the same trust gap the &quot;AI Growth &amp; Adoption&quot; pull-quote above is
            about, one layer down.
          </p>
          <p className={PARAGRAPH_CLASS}>
            <strong className={STRONG_CLASS}>
              Finance and time are the default success criteria — not the only ones.
            </strong>{' '}
            Cost saved and hours reclaimed map straight onto the business-driven-development rubric
            above and read clearly to a recruiter or hiring manager without translation. But quality
            or another qualitative measure is the honest criterion when the task calls for it — the
            tailored-résumé rubric check described under &quot;What &apos;agent&apos;
            means&quot; is graded on whether the output passes, not on how fast it runs, because a
            faster résumé that fails the rubric is a regression wearing a KPI, not an improvement.
            Once a metric is picked, the discipline is in what doesn&apos;t get measured:
            instrumenting every available signal &quot;just in case&quot; produces test-fatigue
            nobody actually looks at, and it invites optimizing for a number the process was never
            scoped to move — scope creep, chasing a metric outside the original design&apos;s
            intent instead of the one that was actually the point.
          </p>
          <p className={PARAGRAPH_CLASS}>
            <strong className={STRONG_CLASS}>The benchmark is also the gate on scale.</strong> A
            process proven against a narrow benchmark hasn&apos;t earned the right to run at ten
            times that scope just because the math says it could — the same
            grassroots-trust-before-headroom argument the pull-quote above makes about users,
            applied to the process itself. Rolling automation out past its established benchmark
            before addressing that hesitation — a team&apos;s or a stakeholder&apos;s fear of an
            automated process replacing one they trusted by hand — repeats the exact mistake the
            pull-quote warns against: capacity spent on scale nobody asked for yet, instead of on
            earning the trust scale depends on.
          </p>
        </div>
      </section>

      {/* --- UNINTENDED CONSEQUENCES --- */}
      <section id="unintended-consequences" className="scroll-mt-24">
        <SectionHeading
          eyebrow="Mental Model"
          title="Bias, geopolitics, and PR risk — not just system design"
        />
        <div className="space-y-4">
          <p className={PARAGRAPH_CLASS}>
            A systems-design interview at Apple raised this directly, through two related prompts
            in the same conversation. The first: design a system that translates English into
            another language. The obvious move is to pick a target language and start on the
            architecture — but the choice of target isn&apos;t a neutral technical default.
            &quot;Chinese&quot; isn&apos;t one language or one dialect; picking it without picking
            which variety, region, and political context it represents is itself a bias decision,
            made before a single API gets designed.
          </p>
          <p className={PARAGRAPH_CLASS}>
            That gets sharper the moment the system does more than move text around. Text-to-text
            translation and text-to-voice translation aren&apos;t the same problem — voice has to
            carry dialect and regional accent, which flat text never surfaces. English → Japanese
            makes it concrete: Kyoto&apos;s dialect (Kansai-ben) and Tokyo&apos;s standard dialect
            are differing regional and contextual representations of the same language, not
            interchangeable defaults. A system that doesn&apos;t account for that risks a real
            mistranslation, not a cosmetic one — and shipping without accounting for that risk is
            a decision with consequences, not a neutral technical default someone else is
            responsible for.
          </p>
          <p className={PARAGRAPH_CLASS}>
            The same interview&apos;s second prompt was two-way translation — English →
            Portuguese and Portuguese → English. The design question wasn&apos;t the algorithm; it
            was the launch market. Shipping that service targeted only at Brazil — one
            Portuguese-speaking market, not Portugal or the rest of the Lusophone world — looks
            like an ordinary &quot;which market ships first&quot; product call. It isn&apos;t just
            that: it carries geopolitical, historical, and public-relations weight for the
            company&apos;s reputation, far outside anything in the codebase.
          </p>
          <p className={PARAGRAPH_CLASS}>
            <strong className={STRONG_CLASS}>
              The system design doesn&apos;t have to change — the engineer&apos;s awareness does.
            </strong>{' '}
            Generalized past translation specifically: an engineer can be asked to design a system
            — &quot;build a translator&quot; — and the system design itself may not need to change
            at all to account for any of this. What has to change is whether the engineer stays
            mindful of the real-world business, geopolitical, and reputational realities sitting
            around that design decision. Skip that awareness and the system still ships, still
            works, still passes review — and still produces unintended real-world consequences
            anyway. That awareness is a distinct discipline from the system design itself:
            business acumen and real-world judgment, layered on top of the technical design, not a
            substitute for it.
          </p>
          <p className={PARAGRAPH_CLASS}>
            It&apos;s the same instinct as{' '}
            <a
              href="#effective-communication"
              className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              Not just what you say — how you say it
            </a>{' '}
            — know who&apos;s actually in the room — taken to its most extreme, highest-stakes
            version. There, the room is one reader or one interviewer; here, the &quot;room&quot;
            is an entire user population, and the same audience-first calibration decides whether
            a design represents their dialect, region, or nationality faithfully, or doesn&apos;t.
          </p>
          <p className={PARAGRAPH_CLASS}>
            It also compounds the exact risk the{' '}
            <a
              href="#system-design-philosophy-ai-growth-adoption"
              className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              AI Growth &amp; Adoption
            </a>{' '}
            pull-quote raises about scaling to users who aren&apos;t there yet. A translation or
            localization choice that misrepresents or alienates a dialect, region, or nationality
            doesn&apos;t just ship a worse product — it erodes the grassroots trust adoption
            actually depends on. It&apos;s the same &quot;users afraid of the technology&quot;
            failure mode, except the fear here is earned by cultural or geopolitical
            insensitivity baked into a language or market decision, not unfamiliarity with the
            technology itself.
          </p>
          <p className={NOTE_CLASS}>
            Flagged: this section is newly-authored synthesis distilling a real, specific
            interview experience — not a verbatim transcript or quote.
          </p>
        </div>
      </section>

      {/* --- EFFECTIVE COMMUNICATION --- */}
      <section id="effective-communication" className="scroll-mt-24">
        <SectionHeading eyebrow="Mental Model" title="Not just what you say — how you say it" />
        <div className="space-y-4">
          <p className={PARAGRAPH_CLASS}>
            Every explanation on this site — this essay included — assumes a specific reader.
            Knowing who&apos;s actually in the room decides more than word choice: it decides how
            much can be assumed. A staff engineer doesn&apos;t need &quot;GitHub Actions&quot;
            defined; a non-technical hiring manager doesn&apos;t need it left undefined either —
            they need it translated into what it does (&quot;a free, scheduled job runner&quot;)
            instead of what it&apos;s called. Reading the audience first, then picking the
            vocabulary, is the same discipline as reading a job description before tailoring a
            résumé to it — the content doesn&apos;t change, the framing does.
          </p>
          <p className={PARAGRAPH_CLASS}>
            <strong className={STRONG_CLASS}>
              Chronological — background, scope, reasons, solution — is the default.
            </strong>{' '}
            For a lay or mixed audience, the order that lands is the order a story would use: what
            problem existed before this (background), how big or specific that problem actually
            was (scope), why the available options narrowed to this one, introduced only after
            the business problem is clear (reasons), and only then the built thing itself, backed
            by a live demonstration (solution). That&apos;s deliberately the same order this
            changelog uses project by project — problem, then what shipped, then what broke, then
            what was learned — because most readers arriving at any one entry haven&apos;t
            already internalized the context a technical peer would bring.
          </p>
          <p className={PARAGRAPH_CLASS}>
            <strong className={STRONG_CLASS}>Reverse-chronological flips it for a technical room.</strong>{' '}
            Lead with the real, data-driven demonstration — a chat agent citing a live Postgres
            number, a résumé PDF that actually renders — and let the audience pull the background
            out with questions, instead of pushing it at them up front. A picture is a thousand
            words: a demonstration that actually works communicates the unspoken narrative — the
            debugging, the trade-offs, the constraint that shaped the design — without spelling
            any of it out first. A technical audience that watches something work will ask
            &quot;how,&quot; and that question is a better entry point into the architecture than
            a slide ever is.
          </p>
          <p className={PARAGRAPH_CLASS}>
            The same chronological/reverse-chronological split governs jargon and humor, not just
            structure. A lay audience gets plain language first and technical vocabulary only once
            a concept has already landed; a technical audience gets the term up front, because
            withholding it reads as padding, not clarity. Humor works the same way — save it for
            after a technical point lands with a technical room, open with it to lower the stakes
            for a non-technical one. Neither is more &quot;correct&quot; than the other; both are
            the same audience-first instinct applied to a different lever.
          </p>
          <div id="effective-communication-shared-experiences" className="scroll-mt-24 space-y-2">
            <p className={PARAGRAPH_CLASS}>
              <strong className={STRONG_CLASS}>
                Shared experience builds rapport before either of you says so.
              </strong>{' '}
              Grounding a hypothetical or behavioral question in a real experience works in both
              directions: probing an interviewer&apos;s background — what they built, what broke,
              what team they came up through — surfaces the overlap, and naming it does more than
              build likeability. It signals relatability for the role itself, the unspoken
              &quot;someone who gets it&quot; that no bullet point communicates directly. That
              affinity isn&apos;t a soft add-on to the technical signal; it&apos;s part of what a
              hiring team is actually screening for, and often part of what moves a conversation
              from one round to the next — or to an offer.
            </p>
          </div>
          <p className={PARAGRAPH_CLASS}>
            Every choice above — order, jargon, humor, which experience to share — is the same
            instinct pointed at a different lever: read the room first, then decide how to say the
            thing that&apos;s true anyway.
          </p>
          <p className={PARAGRAPH_CLASS}>
            For a reusable version of this — stakeholder archetypes and a step-by-step framework
            for navigating any conversation — see{' '}
            <Link
              href="/effective-communication"
              className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              Effective Communication
            </Link>
            .
          </p>
        </div>
      </section>

      {/* --- SYNTHESIS (not one of the models above — how they combine) --- */}
      <div
        id="mental-models-synthesis"
        className="scroll-mt-24 border-t border-zinc-200 dark:border-zinc-800 pt-8 space-y-4"
      >
        <p className="text-base sm:text-lg font-medium italic text-zinc-900 dark:text-white leading-relaxed">
          &quot;There&apos;s too much to know. From lessons learned in university, we apply mental
          models and derive solutions from first principles — applying what&apos;s needed to the
          problem we&apos;re actually trying to solve.&quot;
        </p>
        <p className={PARAGRAPH_CLASS}>
          None of the six sections above are meant to be memorized as a checklist. In an actual
          conversation — working through a problem live, collaboratively, with an interviewer —
          they get combined on the fly: navigating horizontally, the way the SWE Compass&apos;
          end-to-end lifecycle moves through design, data, model, backend, frontend, and ops, and
          vertically, up its abstraction ladder and across its time axis, while applying a
          business-driven-development rubric — and a mindfulness of the real-world consequences a
          design decision carries — to what&apos;s actually worth solving, and communicating that
          navigation out loud as it happens instead of presenting it after the fact. That
          combination — not any one model in isolation — is what this page is actually trying to
          demonstrate. It&apos;s not a rule to follow; it&apos;s a skill to leverage, differently,
          every time.
        </p>
      </div>
    </div>
  );
};

export default ChangelogHeaderEssay;
