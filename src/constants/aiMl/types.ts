/**
 * AI/ML model reference — shared types.
 *
 * See .claude/plans/i-want-a-similar-synchronous-turing.md for the full design
 * rationale. The structural decisions encoded here:
 *
 *  - One file per model under models/<category>/<slug>.ts, so each entry can be
 *    authored in isolation with zero file contention. Only the four category
 *    barrels are shared, and the orchestrator owns those.
 *  - Array position is canonical everywhere (no `order` field to drift), and the
 *    canonical order runs MOST GENERAL -> MOST NICHE at all three levels:
 *    categories, groups within a category, models within a group.
 *  - Four independent classification axes. Conflating any two breaks
 *    immediately: a Gaussian Mixture is unsupervised (paradigm) doing density
 *    estimation (task) under "Probabilistic" (group); an LSTM is a recurrent
 *    architecture doing supervised regression.
 *  - The fields a reader actually needs -- objective, optimization, applied
 *    domains, deployment -- are REQUIRED, so a model cannot be authored without
 *    them. That is the structural guarantee of coverage, not an editorial one.
 *  - Integrity is enforced by scripts/verifyAiMl.ts, never by a module-scope
 *    throw, because a throw would ship into any client bundle importing this.
 */

import type { LucideIcon } from 'lucide-react';

export type AiMlCategoryId =
  | 'classical-ml'
  | 'deep-learning'
  | 'generative-ai'
  | 'reinforcement-learning';

export type CodeLanguageId = 'python' | 'cpp' | 'rust';

/**
 * Reuses the exact stage ids from src/constants/practicalTechnical.ts so
 * /ai-ml and /practical-technical share one vocabulary rather than inventing a
 * parallel one. Labelled "Intuitive / Idiomatic / Optimized" in this section.
 */
export type CodeStageId = 'make-it-work' | 'make-it-right' | 'make-it-fast';

/** Axis 1 -- how it learns. */
export type LearningParadigm =
  | 'supervised'
  | 'unsupervised'
  | 'semi-supervised'
  | 'self-supervised'
  | 'reinforcement';

/**
 * Axis 2 -- what it outputs. Multiple is normal and expected: logistic
 * regression is classification; an autoencoder is dimensionality-reduction AND
 * anomaly-detection.
 */
export type TaskType =
  | 'regression'
  | 'classification'
  | 'clustering'
  | 'dimensionality-reduction'
  | 'density-estimation'
  | 'generation'
  | 'sequence-modeling'
  | 'control'
  | 'ranking'
  | 'anomaly-detection';

/** Axis 3 -- what it is built from. Deep-learning entries only. */
export type NeuralArchitecture =
  | 'perceptron'
  | 'feedforward'
  | 'convolutional'
  | 'recurrent'
  | 'lstm-gru'
  | 'graph'
  | 'transformer'
  | 'autoencoder'
  | 'diffusion'
  | 'hybrid';

/**
 * Separates entries that ARE models from entries that are techniques applied to
 * models (LoRA, RAG, DDIM samplers, the MDP formalism). This is what makes
 * "classify where applicable" a rule the verifier enforces generically, instead
 * of an allowlist of exceptions.
 */
export type EntryKind = 'model' | 'technique';

// ---------------------------------------------------------------------------
// Categories and groups (axis 4 -- topical placement)
// ---------------------------------------------------------------------------

export interface AiMlModelGroup {
  id: string;
  label: string;
  summary: string;
  /**
   * What this group generalizes FROM and specializes INTO. Array order is
   * canonical and runs general -> niche, so this states the rung explicitly
   * rather than leaving a reader to infer it from position alone.
   */
  abstraction: string;
}

export interface AiMlCategory {
  id: AiMlCategoryId;
  label: string;
  eyebrow: string;
  description: string;
  icon: LucideIcon;
  /**
   * First principles: the assumption this whole category buys you, and what it
   * costs. This is the content that makes "classical vs deep vs generative vs
   * RL" answerable rather than a matter of taste.
   */
  premise: string;
  groups: AiMlModelGroup[];
}

// ---------------------------------------------------------------------------
// Applied domains
// ---------------------------------------------------------------------------

/** The three the target role names. Required on every model, always. */
export type FeaturedDomainId =
  | 'time-series-forecasting'
  | 'anomaly-detection'
  | 'optimization';

/**
 * Breadth. A model lists only the ones it genuinely serves -- this is the
 * pressure valve that stops 9 x 58 fabricated profiles. Required coverage stays
 * at the three featured domains; breadth accrues only where it is honest.
 */
export type BreadthDomainId =
  | 'recommendation-ranking'
  | 'natural-language'
  | 'computer-vision'
  | 'causal-inference'
  | 'risk-and-fraud'
  | 'control-and-operations';

export type AppliedDomainId = FeaturedDomainId | BreadthDomainId;

export type DomainFit = 'primary' | 'viable' | 'adapted' | 'not-applicable';

export interface AppliedDomainProfile {
  fit: Exclude<DomainFit, 'not-applicable'>;
  /** HOW -- the actual wiring: what the inputs and targets become here. */
  how: string;
  /** WHERE -- concrete deployed use cases, not hypotheticals. */
  where: string[];
  /** WHY this architecture over the alternatives here -- and when not. */
  why: string;
  /** Domain-specific data prep (lags, windows, residuals, constraint encoding). */
  featurization: string[];
  /** Metric plus validation protocol for this domain specifically. */
  evaluation: string;
  pitfalls: string[];
}

/**
 * One sentence is enough when a model genuinely does not apply -- but it must be
 * said. Discriminated on `fit`, so the UI renders the right shape and TypeScript
 * proves how/where/why exist wherever they are read.
 */
export interface DomainNotApplicable {
  fit: 'not-applicable';
  why: string;
}

export interface AppliedDomains {
  /** No model can silently skip one of these. */
  featured: Record<FeaturedDomainId, AppliedDomainProfile | DomainNotApplicable>;
  /** Opt-in: present only where the fit is real. */
  breadth: Partial<Record<BreadthDomainId, AppliedDomainProfile>>;
}

export type CategoryVerdict = 'default' | 'strong' | 'situational' | 'rarely';

export interface CategoryFit {
  verdict: CategoryVerdict;
  /** WHY, from the problem's structure -- not from popularity. */
  why: string;
  representativeSlugs: string[];
}

export interface AppliedDomain {
  id: AppliedDomainId;
  label: string;
  eyebrow: string;
  featured: boolean;
  /**
   * First principles: what makes this problem the shape it is -- the structure
   * in the data, the loss that actually matters, the constraint that binds.
   */
  problemShape: string;
  /**
   * The four-way comparison, stated once per domain rather than 58 times.
   * Required for all four categories, so a "rarely" verdict has to be argued.
   */
  categoryFit: Record<AiMlCategoryId, CategoryFit>;
  /** What teams reach for first, and the baseline a fancier model must beat. */
  industryBaseline: string;
  evaluationNorms: string[];
  deploymentNorms: string[];
}

// ---------------------------------------------------------------------------
// Objective, optimization, deployment
// ---------------------------------------------------------------------------

/**
 * Not everything minimizes a "loss": Q-learning converges to a Bellman fixed
 * point, a GAN plays a minimax game, a VAE maximizes an ELBO, a linear program
 * optimizes over a feasible polytope, and a genetic algorithm only ever ranks
 * candidates by fitness. Drives the section
 * heading so the UI labels each honestly instead of calling everything a loss.
 */
export type ObjectiveKind =
  | 'loss'
  | 'likelihood'
  | 'elbo'
  | 'minimax'
  | 'fixed-point'
  | 'margin'
  | 'reconstruction'
  | 'constrained-program'
  | 'fitness';

export interface MathExpression {
  /** KaTeX body only, no $ delimiters. */
  formula: string;
  symbols: { symbol: string; meaning: string }[];
}

export interface ModelObjective {
  kind: ObjectiveKind;
  expression: MathExpression;
  /** Plain-English reading of the formula, for someone who skips the TeX. */
  reading: string;
}

export interface ModelOptimization {
  method: string;
  updateRule: MathExpression;
  /** Why this minimizer and not another. */
  rationale: string;
  hyperparameters: { name: string; role: string; typicalRange?: string }[];
  /** Guarantees AND failure modes -- both, or it is marketing. */
  convergence: string;
  complexity: string;
}

/**
 * Serving reality is a required field, not an afterthought: a model reference
 * that stops at the training loop does not describe the job.
 */
export interface ModelDeployment {
  trainingCost: string;
  inferenceProfile: string;
  retrainingCadence: string;
  driftAndMonitoring: string[];
  productionGotchas: string[];
}

/**
 * A bare bullet is an opinion; a bullet plus the context it holds in is
 * judgment. `context` is required for exactly that reason.
 */
export interface TradeoffPoint {
  point: string;
  context: string;
}

// ---------------------------------------------------------------------------
// Code progression
// ---------------------------------------------------------------------------

/**
 * One optimization, tied to something visible in the code. `tradeoff` is
 * required: an optimization presented without its cost is marketing, and it is
 * the first thing an interviewer probes.
 */
export interface CodeOptimization {
  technique: string;
  why: string;
  tradeoff: string;
}

export interface CodeSample {
  code: string;
  /**
   * What changed versus the PREVIOUS stage, and why. Required on 'make-it-right'
   * and 'make-it-fast'; omitted on 'make-it-work', which has no predecessor.
   */
  rationale?: string;
  /**
   * Required and non-empty on 'make-it-fast'. Every `technique` must name a
   * lever from LANGUAGE_STANDARDS[lang].optimizationLevers, so "optimized" is a
   * checkable claim rather than a label.
   */
  optimizations?: CodeOptimization[];
  /**
   * Required on 'make-it-right'. Every entry must appear in
   * LANGUAGE_STANDARDS[lang].conventions -- a closed vocabulary, not free text.
   */
  conventions?: string[];
  libraryName?: string;
  /**
   * Order-of-magnitude cost profile so the progression is measurable rather than
   * asserted. Illustrative, NOT a claimed live benchmark -- the same honesty
   * caveat src/constants/practicalTechnical.ts makes about its `metric` field.
   */
  profile?: string;
}

/**
 * 3 languages x 3 stages as a Record rather than a flat array, so a missing
 * rust['make-it-fast'] is a COMPILE error in the model's own file instead of a
 * runtime check discovered forty files later. Display order comes from
 * AI_ML_LANGUAGES / AI_ML_STAGES, so it never becomes an accident of authoring.
 */
export type ModelImplementations = Record<
  CodeLanguageId,
  Record<CodeStageId, CodeSample>
>;

// ---------------------------------------------------------------------------
// The model entry
// ---------------------------------------------------------------------------

export interface AiMlModel {
  /** kebab-case, globally unique, equal to the filename and the URL segment. */
  slug: string;
  name: string;
  aliases: string[];
  category: AiMlCategoryId;
  /** Must be one of that category's groups[].id. */
  group: string;
  kind: EntryKind;

  // --- the four classification axes ---
  /** Required non-empty when kind === 'model'. */
  paradigms: LearningParadigm[];
  /** Required non-empty when kind === 'model'. */
  taskTypes: TaskType[];
  /** Required iff category === 'deep-learning'; absent otherwise. */
  architecture?: NeuralArchitecture;
  /** Optional one-line justification when the classification is contested. */
  paradigmNote?: string;

  intuition: string;
  objective: ModelObjective;
  optimization: ModelOptimization;
  applications: AppliedDomains;
  deployment: ModelDeployment;
  assumptions: string[];
  pros: TradeoffPoint[];
  cons: TradeoffPoint[];
  relatedSlugs: string[];
  implementations: ModelImplementations;
}

// ---------------------------------------------------------------------------
// Display order and labels
//
// These live in types.ts rather than index.ts on purpose: CodeProgressionTabs is
// a client component and must never reach the model registry, which will hold
// ~520 code strings. Importing this module is safe; importing index.ts is not.
// ---------------------------------------------------------------------------

export const AI_ML_LANGUAGES: {
  id: CodeLanguageId;
  label: string;
  extension: string;
}[] = [
  { id: 'python', label: 'Python', extension: 'py' },
  { id: 'cpp', label: 'C/C++', extension: 'cpp' },
  { id: 'rust', label: 'Rust', extension: 'rs' },
];

export const AI_ML_STAGES: { id: CodeStageId; label: string; blurb: string }[] = [
  {
    id: 'make-it-work',
    label: 'Intuitive',
    blurb: 'The math, transcribed literally. No dependencies.',
  },
  {
    id: 'make-it-right',
    label: 'Idiomatic',
    blurb: 'How this language actually wants it written.',
  },
  {
    id: 'make-it-fast',
    label: 'Optimized',
    blurb: 'Faster, and the justification for each change.',
  },
];

export const PARADIGM_LABELS: Record<LearningParadigm, string> = {
  supervised: 'Supervised',
  unsupervised: 'Unsupervised',
  'semi-supervised': 'Semi-supervised',
  'self-supervised': 'Self-supervised',
  reinforcement: 'Reinforcement',
};

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  regression: 'Regression',
  classification: 'Classification',
  clustering: 'Clustering',
  'dimensionality-reduction': 'Dimensionality reduction',
  'density-estimation': 'Density estimation',
  generation: 'Generation',
  'sequence-modeling': 'Sequence modeling',
  control: 'Control',
  ranking: 'Ranking',
  'anomaly-detection': 'Anomaly detection',
};

export const ARCHITECTURE_LABELS: Record<NeuralArchitecture, string> = {
  perceptron: 'Perceptron',
  feedforward: 'Feedforward',
  convolutional: 'Convolutional',
  recurrent: 'Recurrent',
  'lstm-gru': 'LSTM / GRU',
  graph: 'Graph',
  transformer: 'Transformer',
  autoencoder: 'Autoencoder',
  diffusion: 'Diffusion',
  hybrid: 'Hybrid',
};

export const OBJECTIVE_KIND_LABELS: Record<ObjectiveKind, string> = {
  loss: 'Loss function',
  likelihood: 'Likelihood',
  elbo: 'Evidence lower bound',
  minimax: 'Minimax game',
  'fixed-point': 'Fixed-point condition',
  margin: 'Margin objective',
  reconstruction: 'Reconstruction objective',
  'constrained-program': 'Constrained program',
  fitness: 'Fitness function',
};

export const DOMAIN_FIT_LABELS: Record<DomainFit, string> = {
  primary: 'Primary fit',
  viable: 'Viable',
  adapted: 'Adapted',
  'not-applicable': 'Not applicable',
};

/** Fixed rank so "primary" always sorts above "adapted" on domain pages. */
export const DOMAIN_FIT_ORDER: Record<DomainFit, number> = {
  primary: 0,
  viable: 1,
  adapted: 2,
  'not-applicable': 3,
};

export const CATEGORY_VERDICT_LABELS: Record<CategoryVerdict, string> = {
  default: 'The default',
  strong: 'Strong fit',
  situational: 'Situational',
  rarely: 'Rarely',
};

/** Editorial floor -- a WARN in verifyAiMl, not a hard failure. */
export const MIN_MODELS_PER_CATEGORY = 10;

// ---------------------------------------------------------------------------
// Problem genres and similarity metrics (the /ai-ml landscape section)
// ---------------------------------------------------------------------------

/**
 * How much structure a metric needs the data to have before it can compare two
 * things -- the "level of vectorization". Array order in VECTORIZATION_LEVELS
 * runs from least structure (an unordered set) to most (a whitened coordinate
 * system that needs an estimated covariance).
 */
export type VectorizationLevel =
  | 'set'
  | 'sequence'
  | 'coordinates'
  | 'direction'
  | 'centred'
  | 'whitened';

export interface VectorizationLevelInfo {
  id: VectorizationLevel;
  label: string;
  /** What the data must become before this rung's metrics apply. */
  representation: string;
  /** What preprocessing that costs. */
  preprocessing: string;
}

export const VECTORIZATION_LEVELS: VectorizationLevelInfo[] = [
  {
    id: 'set',
    label: 'Set',
    representation: 'An unordered bag of items. No coordinates, no order, no magnitude.',
    preprocessing: 'None: tokenize or list the items.',
  },
  {
    id: 'sequence',
    label: 'Sequence',
    representation: 'An ordered string of symbols. Order matters, but there is still no coordinate space.',
    preprocessing: 'None: keep the raw characters or tokens in order.',
  },
  {
    id: 'coordinates',
    label: 'Coordinates in ℝⁿ',
    representation: 'A point in an n-dimensional space where every axis is a feature and length is meaningful.',
    preprocessing: 'Embed or engineer features, then put the axes on comparable scales.',
  },
  {
    id: 'direction',
    label: 'Direction',
    representation: 'Only the direction of the vector counts; every point is projected onto the unit sphere.',
    preprocessing: 'L2-normalise each vector, which discards magnitude on purpose.',
  },
  {
    id: 'centred',
    label: 'Centred',
    representation: 'Each vector is measured relative to its own mean, so per-row offsets cancel.',
    preprocessing: 'Subtract each vector’s mean, then normalise.',
  },
  {
    id: 'whitened',
    label: 'Whitened',
    representation: 'Coordinates rotated and rescaled by the data’s covariance, so correlated axes stop double-counting.',
    preprocessing: 'Estimate the covariance Σ and invert it, which needs n ≫ d samples.',
  },
];

export type SimilarityMetricId =
  | 'jaccard'
  | 'edit-distance'
  | 'euclidean'
  | 'manhattan'
  | 'chebyshev'
  | 'dot-product'
  | 'cosine'
  | 'pearson'
  | 'mahalanobis';

/** Which interactive view in the explorer demonstrates the metric. */
export type SimilarityMetricView = 'set' | 'sequence' | 'vector-plane' | 'ratings';

export interface SimilarityMetricProperties {
  /** Satisfies identity, symmetry, and the triangle inequality. */
  isTrueMetric: boolean;
  isBounded: boolean;
  /** Unchanged if one input is multiplied by a positive constant. */
  isScaleInvariant: boolean;
  /** Unchanged if a constant is added to every coordinate of one input. */
  isTranslationInvariant: boolean;
  complexity: string;
}

export interface SimilarityMetric {
  id: SimilarityMetricId;
  label: string;
  kind: 'similarity' | 'distance';
  representation: VectorizationLevel;
  view: SimilarityMetricView;
  /** The geometry the metric implicitly assumes. */
  coordinateSystem: string;
  expression: MathExpression;
  properties: SimilarityMetricProperties;
  /** The mathematics it is built on, and why that makes it behave as it does. */
  foundation: string;
  whenToUse: string;
  /** Why this one rather than its nearest alternatives. */
  whyNotAlternatives: string;
  failureMode: string;
  relatedSlugs: string[];
}

export type ProblemGenreId =
  | 'regression'
  | 'classification'
  | 'optimization'
  | 'nlp-llm'
  | 'forecasting'
  | 'recommender-system'
  | 'computer-vision'
  | 'clustering';

/**
 * Where a genre attaches to the existing taxonomy: a task type when the genre
 * IS an output shape, an applied domain when it is a data modality or
 * business problem.
 */
export type ProblemGenreAnchor =
  | { kind: 'task-type'; id: TaskType }
  | { kind: 'domain'; id: AppliedDomainId };

export interface ProblemGenreLeaf {
  slug: string;
  /**
   * The label shown on the map. Must be the model's name (with or without its
   * parenthetical) or one of its aliases -- verified, so labels never drift
   * from the registry.
   */
  label: string;
  /** Named instances of the family, e.g. Llama for decoder-only LMs. Aliases only. */
  examples?: string[];
}

export interface ProblemGenre {
  id: ProblemGenreId;
  label: string;
  /** The question a reader is asking when this is their problem. */
  question: string;
  /** What the model hands back. */
  output: string;
  /** What is typically minimized or maximized, in words. */
  typicalObjective: string;
  anchor: ProblemGenreAnchor;
  leaves: ProblemGenreLeaf[];
  /** Metrics this genre leans on, most characteristic first. */
  metricIds: SimilarityMetricId[];
  /** Why those metrics fit this genre's data representation. */
  metricRationale: string;
}
