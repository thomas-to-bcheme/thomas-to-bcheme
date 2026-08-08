import React from 'react';
import SweCompassSection from '@/components/sections/changelog/SweCompassSection';

const PARAGRAPH_CLASS = 'text-sm sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed';
const STRONG_CLASS = 'font-bold text-zinc-900 dark:text-white';
const CODE_CLASS =
  'px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-[0.85em] font-mono';
const NOTE_CLASS =
  'text-xs italic text-zinc-400 dark:text-zinc-600 border-l-2 border-zinc-200 dark:border-zinc-800 pl-3';
const BULLET_CLASS =
  "text-sm sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed pl-4 relative before:content-['—'] before:absolute before:left-0 before:text-zinc-300 dark:before:text-zinc-700";

const SectionHeading = ({ eyebrow, title }: { eyebrow: string; title: string }) => (
  <div className="mb-4">
    <span className="text-micro text-zinc-400 block mb-2">{eyebrow}</span>
    <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
      {title}
    </h2>
  </div>
);

/**
 * Full inline essay establishing the portfolio's mental model — mission,
 * funnel/stakeholders, SWE Compass, agent definition, system-design
 * philosophy. Copy shipped verbatim from the approved plan (§4) — do not
 * paraphrase or shorten, including the inline notes distinguishing
 * newly-authored synthesis from direct quotes.
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
        </div>
      </section>

      {/* --- SYSTEM DESIGN PHILOSOPHY --- */}
      <section id="system-design-philosophy" className="scroll-mt-24">
        <SectionHeading
          eyebrow="Mental Model"
          title="Reliability, maintainability, adaptability, resilience — not just CAP theorem"
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
        </div>
      </section>
    </div>
  );
};

export default ChangelogHeaderEssay;
