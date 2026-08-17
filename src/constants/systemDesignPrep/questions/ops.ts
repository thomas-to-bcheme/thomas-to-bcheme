import type { SystemDesignQuestion } from './types';

export const OPS_QUESTIONS: SystemDesignQuestion[] = [
  {
    id: 'hosting-model',
    category: 'ops',
    axes: ['end-to-end', 'time'],
    question:
      'Where does this actually run: self-hosted hardware, a native cloud provider, or a third-party PaaS/edge vendor?',
    clarifyingSubQuestions: [
      "What does this building block need — raw compute, managed storage, networking control? (roadmap.sh/system-design's own component taxonomy — DNS, CDN, load balancers, databases, caching, queues — is the \"menu\" to work through before picking an implementation.)",
      "What's the team's own ops capacity — is there capacity to manage infrastructure, or does that need to be abstracted away?",
      "What's the traffic/cost model — steady-state load favoring reserved capacity, or spiky/unpredictable load favoring pay-per-use?",
      'Are there compliance requirements (GDPR, HIPAA, SOC2) that constrain where data can live or who can access the underlying hardware?',
      'Is multi-region/global distribution a real near-term need, or premature?',
    ],
    approachOptions: [
      {
        label: 'Self-hosted / on-prem hardware',
        whenToUse:
          'Strict data-residency/compliance requirements, extremely high sustained/predictable load where owning hardware amortizes below cloud rental, or an existing ops team with deep infra expertise.',
        tradeoffs:
          'Full control, no vendor markup at scale, but capital cost, your team owns every failure mode, and no elastic burst capacity.',
      },
      {
        label: 'Native cloud (AWS/GCP/Azure)',
        whenToUse:
          'Need the broadest managed-service catalog, multi-region reach, and elastic scaling without owning hardware.',
        tradeoffs:
          'Huge surface area and flexibility, but real operational complexity (IAM, networking, cost governance) and a steeper learning curve.',
      },
      {
        label: 'Third-party PaaS/edge vendor (Vercel, Cloudflare)',
        whenToUse:
          'Frontend-heavy or edge-latency-sensitive workloads, small teams that want to ship without an ops function at all.',
        tradeoffs:
          'Fastest time-to-ship and near-zero ops overhead, but less control, potential vendor lock-in, and usage-based pricing that can surprise at scale.',
      },
    ],
    implementationNotes: [
      {
        consideration: 'Specific vendor selection within a hosting model',
        dependsOn:
          "Once you know 'native cloud' is right, AWS vs. GCP vs. Azure is driven by factors outside pure technical merit: existing team expertise, negotiated enterprise pricing, which specific managed services you need (e.g. GCP's BigQuery vs. AWS Redshift for analytics), and compliance certifications already held by that provider for your industry.",
      },
      {
        consideration: "This portfolio's own answer, as a real example",
        dependsOn:
          'This very site runs a zero-cost hybrid: GitHub Actions as the compute/ETL layer, Vercel as a thin presentation layer, Hugging Face Spaces for GPU inference — see /projects for the full reasoning. That’s a concrete instance of "third-party PaaS" composed from multiple vendors rather than one, chosen specifically because the binding constraint was a $0 budget, not raw performance.',
      },
    ],
    ripplesInto: ['real-time-vs-batch', 'server-vs-serverless'],
    sourceNote: 'synthesized',
  },
  {
    id: 'compute-vs-memory-bound',
    category: 'ops',
    axes: ['abstraction'],
    question: 'Is the bottleneck CPU cycles, or RAM and data movement?',
    clarifyingSubQuestions: [
      'When this workload is under load, is the CPU pegged, or is it waiting on memory/disk/network I/O?',
      'Would adding more cores meaningfully speed this up, or is the working set simply too large to fit in fast memory?',
      'Is the work parallelizable across cores, or inherently sequential?',
    ],
    approachOptions: [
      {
        label: 'Optimize for compute-bound',
        whenToUse: 'CPU is the pegged resource — heavy computation, encoding, ML inference on dense math.',
        tradeoffs: 'More/faster cores and parallelization help directly; but Amdahl’s law limits how much parallelizing a sequential portion actually buys.',
      },
      {
        label: 'Optimize for memory-bound',
        whenToUse: 'CPU is idle waiting on data — large working sets, cache misses, heavy data shuffling.',
        tradeoffs: 'More RAM, better caching, and reducing data movement (columnar formats, batching) help; adding CPU cores alone won’t.',
      },
    ],
    implementationNotes: [
      {
        consideration: 'Profile before optimizing',
        dependsOn:
          'This distinction is only useful once measured (CPU utilization vs. memory bandwidth/cache-miss rate) — guessing which one is the bottleneck without profiling is a common wasted-effort trap.',
      },
    ],
    ripplesInto: ['latency-vs-throughput'],
    sourceNote: 'synthesized',
  },
  {
    id: 'deploy-health-and-oncall',
    category: 'ops',
    axes: ['end-to-end', 'time'],
    question: "Once this is deployed, how do you know it's healthy — and what actually happens when it isn't?",
    clarifyingSubQuestions: [
      "What gates code before it ships — tests, staged rollout, manual approval — versus what only observes it after it's already live?",
      "Are the signals being watched infra-level (CPU, latency, error rate) or outcome-level? A service can be fully \"up\" by every infra metric while quietly returning wrong answers.",
      "Who gets paged, is there a runbook, and what's the actual gap between time-to-detect and time-to-mitigate?",
      "Is this component deterministic software or a served model — because for a model, \"wrong\" usually isn't a crash, it's a slow drift (see #drift-vs-staleness) that infra monitoring alone won't catch.",
    ],
    approachOptions: [
      {
        label: 'CI/CD gates + infra monitoring (logs/metrics/traces)',
        whenToUse:
          'Deterministic services where correctness is binary and failures are loud — tests and validation catch regressions pre-deploy, dashboards and alerts catch outages post-deploy.',
        tradeoffs:
          'Mature, well-understood tooling and fast MTTR for hard failures; blind to silent correctness decay, which is exactly the failure mode ML components are prone to.',
      },
      {
        label: 'SLOs + error budgets',
        whenToUse:
          'Need one shared health contract that both engineering and product hold each other to, with an explicit, pre-agreed answer to how much risk can be spent shipping this week.',
        tradeoffs:
          "Forces prioritization discipline; only works if the org actually halts shipping when the budget's blown, not just on paper.",
      },
      {
        label: 'Model/output observability (drift + quality monitoring)',
        whenToUse:
          'Any component serving a model — infra can look perfectly healthy while prediction quality degrades under distribution shift.',
        tradeoffs:
          "Catches what infra monitoring can't, but usually needs labeled ground truth or a proxy metric that lags reality — see #drift-vs-staleness for the staleness/detection-lag trade-off itself.",
      },
    ],
    implementationNotes: [
      {
        consideration: "This question is domain-agnostic, but its concrete answer isn't",
        dependsOn:
          'A stateless API and a served model need the same operational discipline — CI/CD, monitoring, on-call — but different failure signatures. The model needs the drift/quality layer in addition to standard infra monitoring, not instead of it.',
      },
    ],
    ripplesInto: ['drift-vs-staleness', 'ml-deployment-risk-ladder', 'hosting-model'],
    sourceNote: 'synthesized',
  },
];
