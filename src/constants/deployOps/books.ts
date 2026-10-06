import type { BridgeBook, Book } from '@/types/deployOps';

/**
 * Reading list. Takeaways are inferred from each book's table of contents,
 * publisher description or author repo -- NOT from the book text (the review
 * could not fetch O'Reilly pages). The `basis` and `confidence` fields exist so
 * the UI can say so.
 *
 * Corrections vs the original brief:
 * - "Evals for AI" is titled "Evals for AI Engineers" and is an early release.
 * - "LLMs in Production" is published by Manning, not O'Reilly.
 * - "0642572422783" (Harness Engineering) is an O'Reilly product id, not an ISBN,
 *   so `isbn` is omitted. "Harness" means agent harness, not eval harness.
 * - "Hands-on LLM Serving" is titled "Hands-On LLM Serving and Optimization".
 */
export const BOOKS: readonly Book[] = [
  {
    id: 'llmops',
    title: 'LLMOps: Managing Large Language Models in Production',
    authors: 'Abi Aryan',
    publisher: "O'Reilly",
    status: 'published',
    layer: 'llm',
    url: 'https://www.oreilly.com/library/view/llmops/9781098154196/',
    isbn: '9781098154196',
    basis: 'toc',
    confidence: 'low-medium',
    takeaways: [
      'LLMOps is its own lifecycle layered on MLOps, not a rename of it.',
      'Reliability comes from API-first deployment plus monitoring, privacy and security as first-class chapters.',
      'Hardware and resource management are design inputs, so cost and capacity belong in the architecture.',
    ],
  },
  {
    id: 'ai-engineering',
    title: 'AI Engineering: Building Applications with Foundation Models',
    authors: 'Chip Huyen',
    publisher: "O'Reilly",
    status: 'published',
    layer: 'llm',
    url: 'https://www.oreilly.com/library/view/ai-engineering/9781098166298/',
    isbn: '9781098166298',
    basis: 'toc',
    confidence: 'medium',
    takeaways: [
      'Evaluation gets two chapters because it is the central bottleneck of AI engineering.',
      'Adaptation escalates from prompting to RAG and agents to finetuning; pick the cheapest step that works.',
      'Inference optimization and user feedback close the loop between production and iteration.',
    ],
  },
  {
    id: 'evals-for-ai',
    title: 'Evals for AI Engineers',
    authors: 'Shreya Shankar, Hamel Husain',
    publisher: "O'Reilly",
    status: 'early-release',
    layer: 'llm',
    url: 'https://www.oreilly.com/library/view/evals-for-ai/9798341660717/',
    isbn: '9798341660717',
    basis: 'toc',
    confidence: 'medium',
    note: 'Only part of the table of contents was visible.',
    takeaways: [
      'Start with manual error analysis of real traces and derive metrics from observed failures.',
      'An LLM-as-judge must itself be validated against human labels.',
      'Evaluation is a continuous loop over production traces, including multi-turn sessions.',
    ],
  },
  {
    id: 'observability-engineering',
    title: 'Observability Engineering, 2nd Edition',
    authors: 'Charity Majors, Liz Fong-Jones, George Miranda',
    publisher: "O'Reilly",
    status: 'published',
    layer: 'swe',
    url: 'https://www.oreilly.com/library/view/observability-engineering-2nd/9781098179915/',
    isbn: '9781098179915',
    basis: 'publisher-description',
    confidence: 'medium',
    takeaways: [
      'Observability means asking new questions of production without shipping new code.',
      'Instrumentation belongs in the development loop, not bolted on afterwards.',
      'SLOs and wide telemetry tie engineering work to business impact, now extended to AI workloads.',
    ],
  },
  {
    id: 'llms-in-production',
    title: 'LLMs in Production',
    authors: 'Christopher Brousseau, Matt Sharp',
    publisher: 'Manning',
    status: 'published',
    layer: 'llm',
    url: 'https://www.manning.com/books/llms-in-production',
    isbn: '9781633437203',
    basis: 'publisher-description',
    confidence: 'low-medium',
    note: 'Manning title (also available on the O’Reilly learning platform).',
    takeaways: [
      'The hard part is production, not the model.',
      'Evaluation, security and platform scaling are first-class concerns.',
      'Cost-efficient techniques are what make a deployment viable.',
    ],
  },
  {
    id: 'hands-on-llm-serving',
    title: 'Hands-On LLM Serving and Optimization',
    authors: 'Chi Wang, Peiheng Hu',
    publisher: "O'Reilly",
    status: 'published',
    layer: 'llm',
    url: 'https://www.oreilly.com/library/view/hands-on-llm-serving/9798341621480/',
    isbn: '9798341621480',
    basis: 'toc',
    confidence: 'medium',
    takeaways: [
      'Cost and latency come from the autoregressive loop: prefill versus decode and the KV cache.',
      'Throughput comes from layered optimizations: continuous batching, quantization, speculative decoding, parallelism.',
      'Optimize benchmark-first, measuring each trade-off against defined metrics.',
    ],
  },
  {
    id: 'ai-engineering-interviews',
    title: 'AI Engineering Interviews',
    authors: 'Mina Ghashami, Ali Torkamani',
    publisher: "O'Reilly",
    status: 'early-release',
    layer: 'llm',
    url: 'https://www.oreilly.com/library/view/ai-engineering-interviews/9798341623521/',
    isbn: '9798341623521',
    basis: 'toc',
    confidence: 'medium',
    note: 'Inferred from chapter titles only; table of contents marked not final.',
    takeaways: [
      'The AI engineer owns the whole application stack, from pretrained models to agentic RAG.',
      'Evaluation is a first-class topic with its own chapter.',
      'Theory depth is expected: math, transformers, alignment and long-context modeling.',
    ],
  },
  {
    id: 'harness-engineering',
    title: 'Harness Engineering',
    authors: 'Nicole Koenigstein',
    publisher: "O'Reilly",
    status: 'early-release',
    layer: 'llm',
    url: 'https://www.oreilly.com/library/view/harness-engineering/0642572422783/',
    basis: 'author-repo',
    confidence: 'medium',
    note: 'The identifier 0642572422783 is an O’Reilly product id, not an ISBN. "Harness" means the agent harness, not an eval harness.',
    takeaways: [
      'The harness, not the model, is the reliability layer of an agent system.',
      'Identity, capability boundaries and multi-agent handoff are explicit design objects.',
      'Telemetry, optimization and governance close the loop for agents.',
    ],
  },
];

/** Verified O'Reilly titles that bridge DevOps/SRE, MLOps and LLMOps. */
export const BRIDGE_BOOKS: readonly BridgeBook[] = [
  {
    id: 'reliable-ml',
    title: 'Reliable Machine Learning',
    authors: 'Cathy Chen, Niall Richard Murphy, Kranti Parisa, D. Sculley, Todd Underwood',
    year: 2022,
    isbn: '9781098106225',
    reason: 'The most direct SRE-to-ML bridge: running ML reliably in production.',
  },
  {
    id: 'designing-ml-systems',
    title: 'Designing Machine Learning Systems',
    authors: 'Chip Huyen',
    year: 2022,
    isbn: '9781098107963',
    reason: 'End-to-end production ML: data, deployment, monitoring and retraining.',
  },
  {
    id: 'practical-mlops',
    title: 'Practical MLOps',
    authors: 'Noah Gift, Alfredo Deza',
    year: 2021,
    isbn: '9781098103019',
    reason: 'The CI/CD-minded, tooling-level MLOps option across the major clouds.',
  },
];

/** Suggested order: SRE framing, ML lifecycle depth, LLM ops, then the agent runtime. */
export const READING_ORDER: readonly string[] = [
  'Reliable Machine Learning',
  'Designing Machine Learning Systems',
  'LLMOps',
  'Harness Engineering',
];
