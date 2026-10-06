import type { DeterminismCard } from '@/types/deployOps';

/**
 * LLM layer: where "test it" stops meaning "assert equality".
 *
 * Provider-specific claims (seed semantics, sampling-parameter restrictions,
 * fingerprint fields) vary by vendor and change over time -- re-verify against
 * the provider's docs before quoting them elsewhere.
 */
export const LLMOPS_CARDS: readonly DeterminismCard[] = [
  {
    id: 'prompt-versioning',
    title: 'Prompt versioning',
    layer: 'llm',
    iconName: 'MessageSquareText',
    swePrinciple: 'Source control and code review.',
    extension:
      'Treat prompts as code: a content hash, named template variables, and a link to the eval results that approved that exact version.',
    tools: ['Git', 'Prompt registries', 'Eval-run metadata'],
    tradeoffs: ['Prompts coupled to one model version must be re-evaluated on every model change.'],
    breaksWhere:
      'The same prompt text behaves differently across model snapshots, so the prompt hash alone is not enough: pin it together with the model.',
  },
  {
    id: 'rag-index-versioning',
    title: 'RAG & vector index versioning',
    layer: 'llm',
    iconName: 'Database',
    swePrinciple: 'Blue-green deploys and schema migrations.',
    extension:
      'Record embedding model + version, chunking config and index version. Changing the embedding model forces a full reindex because vector spaces are incompatible: build the new index beside the old and swap an alias.',
    tools: ['Vector DBs with alias swap', 'Embedding-model pinning'],
    tradeoffs: ['A blue-green index doubles storage and embedding cost during migration.'],
    breaksWhere:
      'Approximate nearest-neighbor search is approximate and can vary between index builds, so retrieval results are not bit-stable.',
  },
  {
    id: 'evals',
    title: 'Evals as unit tests',
    layer: 'llm',
    iconName: 'FlaskConical',
    swePrinciple: 'Unit tests and CI gates.',
    extension:
      'Golden sets with regression thresholds gate merges and promotions. Start from manual error analysis of real traces, derive metrics from observed failures, then automate. An LLM-as-judge is itself a model: calibrate it against human labels and track agreement.',
    tools: ['Golden datasets', 'LLM-as-judge', 'Trace analysis'],
    tradeoffs: [
      'Judges are cheap and scalable but biased (position, verbosity, self-preference).',
      'Human labels are the ground truth but do not scale.',
    ],
    breaksWhere:
      'Outputs are probabilistic, and the judge is nondeterministic too. Assert on pass rates with confidence intervals, not equality.',
  },
  {
    id: 'guardrails',
    title: 'Guardrails',
    layer: 'llm',
    iconName: 'Activity',
    swePrinciple: 'Schemas, contracts and input validation.',
    extension:
      'Validate inputs and outputs, filter PII, constrain structured output to a schema, and keep refusal tests in the suite.',
    tools: ['Schema-constrained decoding', 'PII filters', 'Refusal test sets'],
    tradeoffs: ['Every guardrail adds latency and false positives.'],
    breaksWhere:
      'Without constrained decoding the model can still violate the schema or a tool-call JSON contract, so validate and retry rather than trust.',
  },
  {
    id: 'cost-latency',
    title: 'Cost, latency & caching',
    layer: 'llm',
    iconName: 'Cpu',
    swePrinciple: 'SLOs, load tests and capacity planning.',
    extension:
      'Budget tokens per request and per tenant, and track TTFT, inter-token latency and p95/p99. Exact-match and provider prompt caching (stable prefix first) are safe wins; semantic caching trades hit rate for false-hit risk. Route easy requests to smaller models.',
    tools: ['Token budgets', 'Prompt caching', 'Model routing'],
    tradeoffs: [
      'Semantic caching raises hit rate but can return a wrong cached answer.',
      'Smaller models cut cost but need their own evals.',
    ],
    breaksWhere:
      'Usage is unbounded without caps, and latency is batch-dependent under load, so SLOs must be measured under realistic concurrency.',
  },
  {
    id: 'model-pinning',
    title: 'Model & provider pinning',
    layer: 'llm',
    iconName: 'Package',
    swePrinciple: 'Pinned dependencies.',
    extension:
      'Pin dated snapshot ids, never floating aliases like latest. Providers deprecate models, so migrating means re-running the eval suite before cutover and using shadow traffic to compare.',
    tools: ['Dated model snapshots', 'Shadow traffic', 'Eval-gated rollout'],
    tradeoffs: ['Pinning buys stability but accrues migration debt when a snapshot is retired.'],
    breaksWhere:
      'Silent backend changes can alter outputs even for a pinned id. Fingerprint fields help detect it, where the provider exposes one.',
  },
  {
    id: 'nondeterminism',
    title: 'Nondeterminism controls',
    layer: 'llm',
    iconName: 'SlidersHorizontal',
    swePrinciple: 'Hermetic, repeatable tests.',
    extension:
      'Set temperature to 0, fix a seed and constrain top_p where supported. These reduce variance; they do not remove it.',
    tools: ['temperature=0', 'seed (best effort)', 'N-run pass-rate thresholds'],
    tradeoffs: ['Lower temperature cuts variety, which may hurt creative tasks.'],
    breaksWhere:
      'Greedy decoding is still not bitwise deterministic (batch-dependent kernels, floating-point non-associativity). Many providers treat seed as best effort, and some newer models restrict sampling parameters. The practical standard is statistical.',
  },
];
