/**
 * The operational-goal taxonomy.
 *
 * The most common failure mode for a new data scientist is algorithm-first
 * thinking: treating an architecture (Random Forest, Transformer, GNN) as the
 * solution. It is not. An OPERATIONAL GOAL — what the module must functionally
 * achieve in its environment — dictates the applied topics, and models are the
 * implementation primitives chosen to satisfy that goal under specific data and
 * infrastructure constraints.
 *
 * This is a different axis from APPLIED_DOMAINS in appliedDomains.ts, and the
 * two are deliberately kept apart. A domain answers "given this problem shape,
 * which model family, and why". A goal answers the level above: "what is this
 * system for at all". `relatedDomainIds` is the join between them, and
 * scripts/verifyAiMl.ts checks that every one of those ids resolves, so this
 * table can never drift into an orphan.
 *
 * Array order runs from goals that synthesize output, through goals that
 * interpret input, to goals that act on the world and model it.
 */

import type { AppliedDomainId } from './types';

export interface OperationalGoal {
  /** kebab-case, unique — used as the row's DOM id. */
  id: string;
  label: string;
  /** Concrete real-world problems that fall under this goal. */
  appliedTopics: string[];
  /** The bolded lead-in of the rationale, e.g. "Constructing novel artifacts". */
  rationaleLead: string;
  /** Why these topics share this goal, in terms of inputs, transformations,
   *  and output semantics. */
  rationale: string;
  /** Optional KaTeX rendered inline inside the rationale cell. */
  rationaleMath?: string;
  /** Paradigms, losses, data structures, and architectural primitives. */
  implementation: string[];
  /** Join into this site's applied-domain pages. Verified to resolve. */
  relatedDomainIds: AppliedDomainId[];
}

export const OPERATIONAL_GOAL_INTRO =
  'The most common failure mode for emerging data scientists is algorithm-first thinking — the assumption that ML architectures are themselves the solutions. In production systems engineering, operational goals dictate applied topics, and ML algorithms are merely the implementation primitives selected to satisfy those goals under specific mathematical and infrastructural constraints. Systems are classified here by what the module functionally achieves in its environment, then mapped down to the concrete tools used to build it.';

export const OPERATIONAL_GOALS: OperationalGoal[] = [
  {
    id: 'generative-synthesis',
    label: 'Generative & Creative Synthesis',
    appliedTopics: [
      'Text and code generation',
      'Image and video synthesis',
      'Molecule design',
      'Audio generation',
    ],
    rationaleLead: 'Constructing novel artifacts',
    rationale:
      'Systems map high-dimensional latent representations into structured, domain-specific outputs — tokens, pixels, waveforms — that generalize beyond the training distribution to synthesize data that did not previously exist.',
    implementation: [
      'Autoregressive generation',
      'Diffusion models (score matching, Langevin dynamics)',
      'Variational autoencoders',
      'GANs',
      'Cross-entropy optimization',
      'Latent-space interpolation',
    ],
    relatedDomainIds: ['natural-language', 'computer-vision'],
  },
  {
    id: 'retrieval-ranking',
    label: 'Information Retrieval, Ranking & Personalization',
    appliedTopics: [
      'Vector search (RAG)',
      'Recommendation engines',
      'Dynamic slate ranking',
      'Semantic search',
    ],
    rationaleLead: 'Traversing latent spaces',
    rationale:
      'Systems select the most relevant items from a massive catalog by projecting queries and entities into a shared semantic vector space, so relevance becomes a geometry problem rather than a scan.',
    rationaleMath: '\\text{top-}K',
    implementation: [
      'Two-tower architectures',
      'Contrastive learning (InfoNCE, triplet loss)',
      'Approximate nearest-neighbour indices (HNSW, FAISS)',
      'Session-based sequence modeling',
      'Matrix factorization',
    ],
    relatedDomainIds: ['recommendation-ranking', 'natural-language'],
  },
  {
    id: 'perception',
    label: 'Perception & Sensory Signal Understanding',
    appliedTopics: [
      'Object detection',
      'OCR',
      'Scene understanding',
      'ASR and speech processing',
      'Sensor fusion',
    ],
    rationaleLead: 'Translating unstructured noise',
    rationale:
      'Systems ingest continuous physical signals — photons, acoustic waves, LiDAR returns — and extract deterministic semantic attributes such as bounding boxes, phonemes, and spatial coordinates, while remaining robust to environmental noise and out-of-distribution input.',
    implementation: [
      'CNNs and Vision Transformers',
      'Spatial feature pyramids',
      'Bounding-box regression (IoU loss)',
      'Connectionist temporal classification',
      'Out-of-distribution detection',
    ],
    relatedDomainIds: ['computer-vision', 'anomaly-detection'],
  },
  {
    id: 'language-understanding',
    label: 'Natural Language Understanding & Knowledge Extraction',
    appliedTopics: [
      'Entity extraction (NER)',
      'Document abstraction',
      'Text-to-SQL',
      'Sentiment and intent parsing',
    ],
    rationaleLead: 'Mapping symbolic intent',
    rationale:
      'Systems parse the syntax, logic, and grammar of human-authored language into structured relational representations, deterministic schemas, or downstream execution payloads — the output is machine-actionable structure, not prose.',
    implementation: [
      'Encoder-only Transformers (BERT family)',
      'Sequence-to-sequence mapping',
      'Conditional random fields for token classification',
      'Self-attention mechanisms',
      'Masked language modeling',
    ],
    relatedDomainIds: ['natural-language'],
  },
  {
    id: 'decision-control',
    label: 'Decision-Making & Closed-Loop Control',
    appliedTopics: [
      'Autonomous navigation',
      'Robotics continuous control',
      'Algorithmic trading',
      'Resource allocation',
    ],
    rationaleLead: 'Dynamic policy execution',
    rationale:
      'Systems evaluate partially observable environmental states and emit sequential action policies that maximize cumulative reward over a continuous operating horizon. The defining property is that the action changes the next observation, which no supervised loss can express.',
    implementation: [
      'Reinforcement learning (PPO, SAC, DDPG)',
      'Markov decision processes',
      'Bellman equations',
      'Trajectory optimization',
      'Imitation learning',
      'Explore/exploit heuristics',
    ],
    relatedDomainIds: ['control-and-operations', 'optimization'],
  },
  {
    id: 'graph-topology',
    label: 'Graph & Topology Mining',
    appliedTopics: [
      'Fraud network detection',
      'Knowledge-graph completion',
      'Molecular property prediction',
      'Social network analysis',
    ],
    rationaleLead: 'Exploiting non-Euclidean structure',
    rationale:
      'Systems model environments where the functional logic is carried by relational connectivity, edge weights, and node neighbourhoods rather than by position in a matrix grid — so the structural prior is adjacency, not locality.',
    implementation: [
      'Graph neural networks (GCN, GAT, GraphSAGE)',
      'Message-passing architectures',
      'Spectral clustering',
      'DeepWalk / Node2Vec embeddings',
      'Link-prediction heuristics',
    ],
    relatedDomainIds: ['risk-and-fraud', 'control-and-operations'],
  },
  {
    id: 'causal-counterfactual',
    label: 'Causal Inference & Counterfactual Evaluation',
    appliedTopics: [
      'Uplift modeling',
      'Policy impact analysis',
      'Clinical counterfactual testing',
      'Observational adjustment',
    ],
    rationaleLead: 'Estimating treatment effects',
    rationale:
      'Systems isolate cause from statistical confounding, evaluating interventions that were never observed. Predictive accuracy is explicitly not the objective here — identification comes from the design, and the estimand is an effect with an interval.',
    rationaleMath: 'P\\bigl(Y \\mid \\mathrm{do}(X)\\bigr)',
    implementation: [
      'Do-calculus',
      'Inverse probability of treatment weighting',
      'Meta-learners (S-, T-, X-learner)',
      'Double machine learning',
      'Instrumental variables',
    ],
    relatedDomainIds: ['causal-inference'],
  },
  {
    id: 'surrogate-digital-twins',
    label: 'Surrogate Modeling & Digital Twins',
    appliedTopics: [
      'Physical simulation approximation',
      'Time-series forecasting',
      'Industrial telemetry monitoring',
    ],
    rationaleLead: 'Emulating complex dynamic systems',
    rationale:
      'Systems approximate a computationally expensive or non-linear physical process by mapping sequential inputs to predicted future states, standing in for a simulator that is too slow to query in the loop. Non-stationarity is the binding constraint, which is why evaluation must be walk-forward.',
    implementation: [
      'Physics-informed neural networks',
      'Neural ODEs',
      'LSTMs and Transformers with temporal attention',
      'Autoregressive forecasting',
      'Expanding-window / walk-forward evaluation protocols',
    ],
    relatedDomainIds: ['time-series-forecasting', 'control-and-operations'],
  },
];
