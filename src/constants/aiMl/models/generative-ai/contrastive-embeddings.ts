import type { AiMlModel } from '../../types';

/**
 * Contrastive embeddings — the entry where the negatives are the model.
 *
 * The architecture is an encoder anyone could write. Every consequential
 * decision is about what counts as a positive pair, what counts as a
 * negative, and how the temperature scales the resulting penalty. That is
 * unusual enough to be worth its own entry, and it is why two teams using
 * the same encoder get very different retrieval quality.
 */
export const CONTRASTIVE_EMBEDDINGS: AiMlModel = {
  slug: 'contrastive-embeddings',
  name: 'Contrastive Embeddings',
  aliases: ['InfoNCE', 'Dual encoder', 'Bi-encoder', 'SimCLR', 'CLIP-style training', 'Sentence embeddings'],
  category: 'generative-ai',
  group: 'representation-retrieval',
  kind: 'technique',

  paradigms: ['self-supervised', 'supervised'],
  taskTypes: ['ranking', 'clustering', 'dimensionality-reduction', 'anomaly-detection', 'classification'],
  paradigmNote:
    'Self-supervised when the positive pairs come from augmentation or co-occurrence, supervised when they come from labels or click logs — and the distinction matters less than it looks, because in both cases the label is the pairing rather than a target value. What is genuinely unusual is that the negatives carry as much of the learning signal as the positives, so the sampling policy is part of the model definition rather than a data-loading detail.',

  intuition:
    'Nothing here specifies what an embedding should be. It specifies only that paired things should end up closer than unpaired things, and the geometry falls out of enforcing that over millions of pairs. This is why the technique is defined almost entirely by its data: the encoder is ordinary, and the consequential choices are what counts as a positive pair, where the negatives come from, and the temperature that decides how hard the loss pushes on the closest wrong answer. Get the pairs right and a small encoder beats a much larger one. Get them wrong and the embeddings look fine on held-out pairs from the same distribution while failing on everything real, because the model learned to solve the sampling artefact rather than the task.',

  objective: {
    kind: 'loss',
    expression: {
      formula:
        '\\mathcal{L} = -\\frac{1}{N}\\sum_{i=1}^{N} \\log \\frac{\\exp\\bigl(\\mathrm{sim}(z_i, z_i^+)/\\tau\\bigr)}{\\exp\\bigl(\\mathrm{sim}(z_i, z_i^+)/\\tau\\bigr) + \\sum_{j \\in \\mathcal{N}(i)} \\exp\\bigl(\\mathrm{sim}(z_i, z_j)/\\tau\\bigr)}',
      symbols: [
        { symbol: 'z_i, z_i^+', meaning: 'embeddings of a positive pair, almost always L2-normalized so similarity is a cosine' },
        { symbol: '\\mathcal{N}(i)', meaning: 'the negatives for anchor i — the design decision that dominates everything else here' },
        { symbol: '\\tau', meaning: 'temperature; small values concentrate the gradient on the single hardest negative' },
        { symbol: '\\mathrm{sim}', meaning: 'cosine similarity after normalization, which bounds the logits and makes the temperature meaningful' },
        { symbol: 'N', meaning: 'anchors in the batch; with in-batch negatives the batch size IS the negative count' },
      ],
    },
    reading:
      'A cross-entropy over similarities: identify the true partner among a set of candidates. Two things are worth reading carefully. The denominator contains the negatives, so the loss is defined relative to a candidate set rather than in absolute terms — the same embedding is good or bad depending on what it is compared against, which is why the negative-sampling policy belongs in the model definition and not in the data loader. And the temperature is not a nuisance parameter: expanding the gradient shows that its reciprocal scales the weight on each negative, so a small temperature makes the loss almost entirely about the single closest wrong answer. That is the hard-negative behaviour people attribute to sampling tricks, and a substantial part of it is just the temperature.',
  },

  optimization: {
    method: 'AdamW with the largest batch that fits, since in-batch negatives make batch size a capacity parameter rather than a throughput knob',
    updateRule: {
      formula:
        '\\nabla_{z_i}\\mathcal{L} = \\frac{1}{\\tau}\\Bigl[\\sum_{j} p_{ij} z_j - z_i^+\\Bigr], \\quad p_{ij} = \\mathrm{softmax}_j\\bigl(\\mathrm{sim}(z_i, z_j)/\\tau\\bigr)',
      symbols: [
        { symbol: 'p_{ij}', meaning: 'softmax weight on negative j — concentrated on the nearest negative when tau is small' },
        { symbol: '1/\\tau', meaning: 'scales the whole gradient, which is why temperature and learning rate interact strongly' },
        { symbol: '\\sum_j p_{ij} z_j', meaning: 'a weighted centroid of the negatives; the anchor is pushed away from it' },
        { symbol: 'z_i^+', meaning: 'the positive, pulled toward unconditionally and with weight 1 regardless of temperature' },
      ],
    },
    rationale:
      'The gradient makes the mechanism legible in a way the loss does not. Each anchor is pulled toward its positive with unit weight and pushed away from a softmax-weighted centroid of its negatives, and the temperature controls only how peaked that weighting is. At high temperature all negatives contribute roughly equally and training is stable but slow to sharpen; at low temperature the gradient is dominated by the nearest negative, which is the informative one and also the one most likely to be a mislabelled positive. That single sentence is the whole tension of the technique. It also explains the batch-size effect: with in-batch negatives the candidate set is the batch, so a larger batch is a harder and better-estimated problem rather than merely a faster one — which is why published results at batch sizes in the thousands do not reproduce at a hundred, and why the memory bank and momentum-encoder tricks exist at all.',
    hyperparameters: [
      { name: 'temperature', role: 'The most consequential knob. Small values concentrate the gradient on the hardest negative, which is both the signal and the risk', typicalRange: '0.01 to 0.2' },
      { name: 'batch size', role: 'With in-batch negatives this is the negative count, so it is a capacity parameter rather than a throughput knob', typicalRange: '256 to 32768' },
      { name: 'hard-negative ratio', role: 'Share of mined negatives against random ones. Too high and false negatives dominate the gradient', typicalRange: '0 to 0.5' },
      { name: 'embedding dimension', role: 'Trades retrieval quality against index memory and query latency; gains flatten well before most defaults', typicalRange: '64 to 1024' },
      { name: 'augmentation strength', role: 'Defines what invariance is learned. This is the actual task specification in the self-supervised setting', typicalRange: 'task-specific' },
      { name: 'projection head depth', role: 'Discarded after training. The representation before it usually transfers better than the one the loss was applied to', typicalRange: '0 to 2 layers' },
    ],
    convergence:
      'Three characteristic failures, and the first two look nothing alike. Representation collapse is the classic one: all embeddings converge to a narrow cone or a single point, the loss plateaus at log of the batch size, and the diagnostic is the mean pairwise similarity rather than the loss — which is why alignment and uniformity are tracked as separate metrics. It arises when the negatives are too easy or too few, and normalization plus enough negatives usually prevents it. The second failure is subtler and more common in practice: false negatives. With in-batch sampling, some negatives are genuine positives that happen to be in the batch, and at a small temperature the gradient concentrates precisely on those, so the model is explicitly trained to separate things that belong together. The symptom is good held-out pair accuracy with poor retrieval, which is easy to misread as an indexing problem. The third is a shortcut failure: the encoder solves the augmentation rather than the semantics — matching on colour histogram or on a tokenizer artefact — and the tell is that accuracy collapses under a mild distribution shift that should not matter.',
    complexity:
      'Encoding is O(B·C) for encoder cost C, and the similarity matrix adds O(B²·d), which is negligible until batch sizes reach the thousands and then becomes a real memory term at B² floats. Retrieval at serving time is O(log n) with an approximate index against O(n·d) for exact search, and that gap is the entire reason this technique is preferred to a cross-encoder despite being less accurate pair-for-pair.',
  },

  applications: {
    featured: {
      'time-series-forecasting': {
        fit: 'adapted',
        how: 'Learn a window embedding by treating temporally adjacent or augmentation-related windows as positives, then use the embedding for retrieval-based forecasting: find the k nearest historical windows and combine their continuations. The embedding replaces a hand-built similarity measure, which is the actual contribution — the forecast itself is a weighted average of what happened next.',
        where: [
          'Retrieval-based forecasting over a large historical panel, where analogues exist and are worth finding',
          'Regime identification, where the embedding clusters windows into states a downstream model conditions on',
          'Cold-start series with no history of their own but many similar series to borrow from',
          'Similarity search over a series library for exploration and quality control',
        ],
        why: 'The analogue story is genuinely useful where the panel is large enough that near-duplicates of the current window exist. It also has a property most forecasting methods lack: the retrieved neighbours are an explanation, so a forecast comes with the historical episodes that produced it, which is frequently worth more to a reviewer than an accuracy point. Two honest limits. Defining positives is harder than in language or vision — temporal adjacency conflates "similar" with "nearby", so the embedding can learn a clock rather than a shape, and this is the default failure. And a properly tuned direct forecaster usually beats retrieval on plain accuracy, so the case for this rests on interpretability, cold-start, or a genuinely enormous analogue library rather than on error metrics.',
        featurization: [
          'Normalize each window before encoding, or the embedding sorts by level rather than by shape',
          'Use augmentations that preserve shape — jitter, scaling, masking — rather than adjacency alone, which teaches a clock',
          'Exclude windows overlapping the anchor from the negatives; they are false negatives by construction and the temperature will find them',
          'Keep the split strictly temporal, since retrieval from the future is the easiest leak in this whole design',
        ],
        evaluation:
          'Rolling-origin backtesting of the retrieval forecast against a direct forecaster, which is the comparison that decides whether the interpretability is free or paid for. Separately, inspect retrieved neighbours by eye on a sample — an embedding that retrieves windows from the same month rather than the same shape is a clock, and no aggregate metric says so clearly.',
        pitfalls: [
          'Adjacency-only positives, which teach recency rather than similarity',
          'Overlapping windows as negatives, which are false negatives the small temperature then punishes hardest',
          'Retrieval across a non-temporal split, which leaks the future into the neighbour set',
          'No direct-forecaster baseline, so the accuracy cost of the interpretability is never measured',
        ],
      },
      'anomaly-detection': {
        fit: 'adapted',
        how: 'Fit the embedding on normal data only, then score by distance to the k nearest normal neighbours in embedding space — a point far from everything the encoder has seen packed together is anomalous. The embedding does the work of turning a high-dimensional distance that means nothing into one that means something.',
        where: [
          'High-dimensional inputs where raw-space distance is meaningless — images, logs, sensor windows',
          'Detection with abundant normal data and effectively no labelled anomalies',
          'Settings where the nearest normal neighbours must be shown as evidence for the alert',
          'Novelty detection over a growing reference set, where new normal modes can be added without retraining',
        ],
        why: 'A reasonable fit with one important caveat about what the score is. The technique earns its place because a learned metric makes nearest-neighbour detection viable in dimensions where Euclidean distance is uninformative, and because the retrieved neighbours are a natural explanation for an alert — the reviewer sees what the system compared against. The caveat is that this is a distance, not a probability: it has no calibration, the threshold is chosen from a quantile of a normal-data score distribution and nothing more, and it does not compose with other detectors that produce genuine likelihoods. The characteristic failure is subtle and worth naming: whatever invariances the augmentations built in become blind spots, so if the augmentation included brightness jitter the embedding cannot see a brightness anomaly. That means the augmentation policy silently determines which anomalies are detectable, and it is rarely reviewed with that in mind.',
        featurization: [
          'Fit on verified-normal data only; contaminated training data teaches the encoder that anomalies belong in the normal cone',
          'Review augmentations as a list of things the detector will be blind to, because that is exactly what they are',
          'L2-normalize before indexing, since the index and the loss must use the same metric',
          'Set the threshold from a quantile of normal-data scores, and state plainly that it is not calibrated',
        ],
        evaluation:
          'Precision at the alert volume the reviewers can actually handle, rather than AUC — the operating point is a staffing constraint and AUC hides it. Score stability under benign shift matters as much as detection rate here, because an embedding that drifts moves every threshold with it.',
        pitfalls: [
          'Treating the distance as a probability; it is uncalibrated and does not combine with likelihood-based detectors',
          'Augmentations that make the anomaly of interest invariant, which is a blind spot introduced on purpose and forgotten',
          'Contaminated normal data, which is the failure that most flatters offline metrics',
          'A stale reference set, so legitimate new normal modes register as anomalies',
        ],
      },
      optimization: {
        fit: 'primary',
        how: 'Three separate optimization problems live here. The loss itself is a constrained geometry problem — pull positives together, spread everything else out, on a sphere. The negative-sampling policy is a sampling-design problem with a sharp trade at its centre. And serving is an index problem, since the whole point of a dual encoder over a cross-encoder is precomputable embeddings.',
        where: [
          'Temperature as the knob that decides how much of the gradient the hardest negative receives',
          'Batch size as a capacity parameter, because in-batch negatives make the batch the candidate set',
          'Hard-negative mining against false-negative risk, which is the central and unavoidable trade',
          'Alignment against uniformity as two measurable quantities the single loss value conflates',
        ],
        why: 'Worth studying for two lessons that transfer well beyond embeddings. The first is that a loss defined relative to a sampled candidate set makes the sampler part of the model, and no amount of architecture work substitutes for getting it right — this is the clearest example in this reference of the data policy dominating the model. The second is that decomposing a single loss into two measurable properties, alignment and uniformity, turns an opaque number into a diagnosis: collapse shows as uniformity going to zero while the loss sits at log of the batch size, and nothing about the loss alone distinguishes that from healthy training. Both lessons generalize to any objective with a sampled denominator.',
        featurization: [
          'Track alignment and uniformity separately; the loss value alone cannot distinguish collapse from convergence',
          'Tune temperature and learning rate together, since the gradient scales with the reciprocal of temperature',
          'Cap the hard-negative share and audit mined negatives for false positives, which are what a small temperature punishes hardest',
          'Measure retrieval with the production index rather than exact search, because the index is part of the system',
        ],
        evaluation:
          'Recall at k through the actual approximate index, since exact-search numbers overstate what production will do. Alongside it, the mean pairwise similarity as a collapse guard, and a scan of mined hard negatives for false positives — a few minutes of reading the mined pairs routinely finds a systematic error the metrics cannot.',
        pitfalls: [
          'Tuning temperature by loss value, which improves as the geometry degenerates',
          'Reporting exact-search recall for a system that will serve through an approximate index',
          'Mining ever-harder negatives without auditing them, which trains the model to separate true positives',
          'Comparing across batch sizes without saying so, since batch size changes the problem rather than the speed',
        ],
      },
    },
    breadth: {
      'natural-language': {
        fit: 'primary',
        how: 'Train a dual encoder on query-document pairs — from click logs, question-answer data or synthetic generation — then index document embeddings and retrieve by nearest neighbour at query time. The two towers may share weights or not; sharing is usually better with limited data and worse when queries and documents have genuinely different surface form.',
        where: [
          'First-stage retrieval in search and in retrieval-augmented generation, where the candidate pool is too large to score pairwise',
          'Semantic deduplication and near-duplicate detection at corpus scale',
          'Clustering and topic discovery over documents with no labels',
          'Zero-shot classification by embedding label descriptions and retrieving the nearest',
        ],
        why: 'The dominant approach for first-stage retrieval, and the reason is structural: document embeddings are precomputed, so query time is one encoder pass plus an index lookup regardless of corpus size. A cross-encoder is more accurate on any single pair and cannot be precomputed, which is why the standard architecture is contrastive retrieval followed by cross-encoder reranking of the top candidates — the two are complements rather than alternatives. The honest caveats are about what embeddings are bad at. Exact matching on rare terms, identifiers and numbers is a known weakness, which is why hybrid retrieval with a lexical index remains standard practice rather than a legacy holdover. And these models are sensitive to the query-document asymmetry in their training data, so a model trained on short keyword queries degrades on long natural-language ones in a way that is invisible until it is measured.',
        featurization: [
          'Match the query and document prefixes or instructions the checkpoint was trained with; they are part of the model',
          'Use hybrid retrieval with a lexical index, since embeddings reliably miss exact rare-term matches',
          'Mine hard negatives from the current index rather than sampling randomly, and audit them for false negatives',
          'Rerank the top candidates with a cross-encoder; the two-stage design exists because each stage is bad at the other job',
        ],
        evaluation:
          'Recall at the cutoff the reranker actually consumes — recall at 100 when 100 are reranked, not at 10 — since the first stage exists to feed the second. Measure through the production index, and break results out by query length and by rare-term presence, which is where the failures hide.',
        pitfalls: [
          'Omitting the instruction prefix the checkpoint expects, which degrades everything with no error',
          'Pure dense retrieval where exact identifier matching matters',
          'Query-distribution mismatch between training and serving, invisible until measured by query type',
          'Evaluating at a cutoff unrelated to how many candidates the downstream stage consumes',
        ],
      },
      'computer-vision': {
        fit: 'primary',
        how: 'Either self-supervised, with two augmented views of the same image as the positive pair, or paired across modalities using image-caption data. The augmentation policy in the first case and the caption distribution in the second are the actual task specification — they define what the encoder is required to treat as the same thing.',
        where: [
          'Pretraining vision encoders without labels, then fine-tuning or linear-probing for a downstream task',
          'Image retrieval and visual near-duplicate detection at scale',
          'Zero-shot classification by embedding class descriptions and retrieving the nearest',
          'Cross-modal search where text queries retrieve images and the reverse',
        ],
        why: 'Established practice, and the instructive part is how visible the augmentation dependence is: strong colour jitter produces embeddings invariant to colour, which is exactly right for object recognition and exactly wrong for anything where colour is the signal. Nowhere else in this reference is a hyperparameter so directly a task specification. Contrastive pretraining also outperforms masked reconstruction under linear probing while being weaker for dense prediction, so the two objectives rank differently depending on the downstream task and neither is generally better. The cross-modal variant is the more interesting case because the supervision is nearly free at web scale, and its weakness follows from the same fact: captions describe salient objects, so these embeddings are strong on object identity and weak on counting, spatial relations and fine-grained attributes.',
        featurization: [
          'Choose augmentations as a statement of what must be treated as identical, because that is what they are',
          'Use large batches or a memory bank; the negative count is a capacity parameter here more than anywhere',
          'Discard the projection head at inference — the layer beneath it transfers better than the one the loss touched',
          'Do not expect counting or spatial reasoning from caption-supervised embeddings; the supervision never contained it',
        ],
        evaluation:
          'Linear probe and full fine-tuning reported separately, because they rank pretraining objectives differently and a single number hides that. For retrieval, recall at k through the production index, plus a deliberate check on the attributes the augmentations made invariant.',
        pitfalls: [
          'Augmentations that destroy the signal the downstream task needs',
          'Small batches without a memory bank, which starves the loss of negatives and invites collapse',
          'Keeping the projection head, which usually costs transfer quality',
          'Assuming fine-grained or relational understanding from caption supervision that never taught it',
        ],
      },
      'recommendation-ranking': {
        fit: 'primary',
        how: 'Embed users and items into one space using interactions as positive pairs, then retrieve candidates by nearest neighbour against the user embedding. This is candidate generation, not ranking — a separate and usually much heavier model scores the retrieved few hundred.',
        where: [
          'Candidate generation over catalogues too large to score item by item',
          'Cold-start items, embedded from content features rather than from interaction history',
          'Related-item and complementary-item retrieval from co-occurrence',
          'Session-based retrieval where the recent sequence is encoded as the query',
        ],
        why: 'Standard architecture for candidate generation, for the same precomputation reason as text retrieval. The domain-specific complication is popularity bias, and it is severe: random negatives are dominated by unpopular items, so the model learns that popular items are universally good and the embedding space collapses toward a popularity ordering. The standard correction is sampling negatives proportional to popularity with a logit correction, and it is not optional — without it the retrieved set is a bestseller list with extra steps. The second complication is that interaction positives conflate interest with exposure: a user clicked what was shown, so the embedding partly learns the previous ranker’s behaviour, which is a feedback loop that offline metrics computed on logged data cannot see at all.',
        featurization: [
          'Sample negatives by popularity with a logit correction; uncorrected random negatives produce a popularity ranking',
          'Include content features so cold-start items can be embedded without interaction history',
          'Refresh item embeddings on a schedule, since catalogue drift moves the geometry under a static index',
          'Treat the exposure-versus-interest confound explicitly, because logged-data metrics cannot surface it',
        ],
        evaluation:
          'Recall of relevant items at the candidate-set size the ranker consumes, split by item popularity so the tail is visible, followed by an online test — offline metrics on logged data are measuring the previous ranker as much as this one. Track catalogue coverage of the retrieved set, since a collapsed embedding retrieves the same few thousand items for everyone.',
        pitfalls: [
          'Uncorrected random negatives, which bake in popularity bias',
          'Confusing candidate generation with ranking and expecting calibrated scores from a distance',
          'A stale item index after catalogue turnover',
          'Believing offline metrics on logged data, which reflect the incumbent ranker’s exposure decisions',
        ],
      },
    },
  },

  deployment: {
    trainingCost:
      'Dominated by batch size rather than by model size, because in-batch negatives make the batch the candidate set — which pushes training toward large-memory hardware or a memory bank even for modest encoders. Fine-tuning an existing embedding model on domain pairs is hours on one accelerator and is usually the right starting point. Illustrative, not a measured benchmark.',
    inferenceProfile:
      'One encoder pass per query plus an index lookup, with document embeddings precomputed. That is the entire architectural argument for a dual encoder over a cross-encoder, and it holds: query latency is independent of corpus size, while index memory grows linearly with it.',
    retrainingCadence:
      'Re-embedding the corpus is the expensive operation, so the cadence is set by how often that can be afforded rather than by how often the model improves. Note the coupling that surprises people: a new encoder invalidates every stored embedding, so model updates and full re-indexing are one operation and must be planned together.',
    driftAndMonitoring: [
      'Mean pairwise similarity of a fixed probe set as a collapse guard — the loss will not tell you',
      'Recall at k on a frozen labelled probe set, measured through the production index rather than exact search',
      'Query-embedding norm and nearest-neighbour distance distribution, which shift when queries move out of domain',
      'Index staleness: the fraction of corpus items embedded by an older encoder version, which should normally be zero',
      'Score-distribution drift on normal data where the embedding feeds anomaly detection, since every threshold moves with it',
    ],
    productionGotchas: [
      'Changing the encoder invalidates every stored embedding. Model updates and full corpus re-indexing are a single operation, and treating them separately produces a silently mixed index',
      'Embeddings from different models are not comparable even at identical dimension. Mixing two versions in one index yields nonsense with no error anywhere',
      'The similarity metric must match training. An index configured for inner product over embeddings trained with cosine degrades quietly rather than failing',
      'The instruction or prefix a checkpoint was trained with is part of the model; omitting it at query time degrades retrieval with no error',
      'A distance is not a probability. Thresholds are quantiles of an observed score distribution, they do not transfer across encoder versions, and they do not compose with likelihood-based scores',
      'Exact-search evaluation overstates production recall, sometimes substantially. Measure through the index that will actually serve',
      'Augmentation-induced invariances are permanent blind spots, and they are rarely written down anywhere a future maintainer will find them',
    ],
  },

  assumptions: [
    'A meaningful notion of positive pair exists in the data, since that pairing is the entire supervision signal',
    'The negatives approximate the candidate distribution the system will face at serving time',
    'A single geometry can serve every downstream use, which fails when different consumers need different notions of similarity',
    'Similarity is symmetric and transitive enough for a metric space to represent it — asymmetric relations such as entailment fit badly',
    'The corpus can be re-embedded whenever the encoder changes, since the two are inseparable operations',
  ],

  pros: [
    {
      point: 'Precomputable embeddings, so query cost is independent of corpus size',
      context:
        'The whole architectural argument for a dual encoder. One encoder pass plus an index lookup at any scale, which is why this is the first stage of essentially every large retrieval system.',
    },
    {
      point: 'Supervision from pairing alone, with no labels required',
      context:
        'Co-occurrence, augmentation and click logs all provide pairs, which makes the technique available where labels are not. The trade is that the pairing definition becomes the most consequential decision in the system.',
    },
    {
      point: 'One geometry serves retrieval, clustering, deduplication and detection',
      context:
        'A single trained encoder supports several unrelated consumers, which is unusual and a genuine operational advantage — provided they all want the same notion of similarity, which is worth checking.',
    },
    {
      point: 'Retrieved neighbours are a built-in explanation',
      context:
        'Every result comes with the items it was closest to, which for anomaly review and forecast justification is frequently worth more than an accuracy point.',
    },
  ],

  cons: [
    {
      point: 'The negative-sampling policy dominates the architecture',
      context:
        'The loss is defined relative to a sampled candidate set, so the sampler is part of the model. Two teams with the same encoder and different negatives get materially different systems, and no architecture work compensates.',
    },
    {
      point: 'False negatives are punished hardest by design',
      context:
        'In-batch negatives include genuine positives, and a small temperature concentrates the gradient on exactly those. The symptom is good pair accuracy with poor retrieval, which is easy to misdiagnose as an indexing problem.',
    },
    {
      point: 'Representation collapse, invisible in the loss',
      context:
        'Embeddings converge to a narrow cone while the loss plateaus at log of the batch size. Diagnosable only from mean pairwise similarity or a uniformity metric, which is why both are tracked separately.',
    },
    {
      point: 'Batch size is a capacity parameter, not a throughput knob',
      context:
        'A larger batch is a harder and better-estimated problem, so published results at batch sizes in the thousands do not reproduce at a hundred. Memory banks and momentum encoders exist to work around this rather than to speed anything up.',
    },
    {
      point: 'Weak at exact matching',
      context:
        'Rare terms, identifiers and numbers are reliably missed, which is why hybrid retrieval with a lexical index is standard practice rather than legacy baggage.',
    },
    {
      point: 'The score is a distance with no calibration',
      context:
        'Thresholds are quantiles of an observed distribution, do not transfer across encoder versions, and do not compose with likelihood-based scores. Anything needing a probability needs a different model.',
    },
    {
      point: 'Augmentation choices become permanent blind spots',
      context:
        'Whatever the augmentations made invariant, the embedding cannot see. That silently determines which anomalies are detectable and which distinctions are representable, and it is almost never documented.',
    },
  ],

  relatedSlugs: ['ann-index', 'masked-lm', 'rag', 'autoencoder', 'vision-transformer'],

  implementations: {
    python: {
      'make-it-work': {
        code: `"""InfoNCE contrastive embeddings, transcribed from the objective.

No ML library. The loss written out so the two halves can be read against
each other:

    L = -mean_i log[ exp(sim(z_i, z_i+)/tau)
                     / (exp(sim(z_i, z_i+)/tau) + sum_j exp(sim(z_i,z_j)/tau)) ]

The thing to read for: the DENOMINATOR contains the negatives. The loss is
defined relative to a candidate set, not in absolute terms, so the same
embedding is good or bad depending on what it is compared against. That is
why the negative-sampling policy belongs in the model definition and not
in the data loader.
"""

import math


def dot(left, right):
    return sum(left[idx] * right[idx] for idx in range(len(left)))


def l2_normalize(vector):
    """Project onto the unit sphere.

    Not cosmetic. Normalization bounds every similarity to [-1, 1], which
    is what makes the temperature a meaningful scale rather than an
    arbitrary one, and it is the main structural defence against collapse.
    """
    norm = math.sqrt(dot(vector, vector))
    if norm < 1e-12:
        return [0.0] * len(vector)
    return [value / norm for value in vector]


def encode(features, w_hidden, w_out):
    """The encoder is deliberately boring: one hidden layer and a project.

    Everything consequential about this technique is in the pairs and the
    negatives, not here. Swapping this for a transformer changes the
    quality and changes none of the reasoning below it.
    """
    hidden = [
        max(0.0, dot(row, features)) for row in w_hidden
    ]
    projected = [dot(row, hidden) for row in w_out]
    return l2_normalize(projected)


def info_nce_loss(anchors, positives, negatives_for, temperature):
    """The loss, one anchor at a time.

    \`negatives_for(i)\` returns the candidate set for anchor i. Passing it
    as a function rather than a matrix is the honest signature: the
    sampling policy is an argument to the loss, because it IS part of the
    loss.
    """
    if temperature <= 0.0:
        raise ValueError("temperature must be positive")

    total = 0.0
    for idx, anchor in enumerate(anchors):
        positive_logit = dot(anchor, positives[idx]) / temperature

        logits = [positive_logit]
        for negative in negatives_for(idx):
            logits.append(dot(anchor, negative) / temperature)

        # Log-sum-exp over positive AND negatives. The positive appears in
        # the denominator too -- it is one candidate among many, and the
        # loss asks the model to pick it out.
        top = max(logits)
        log_z = top + math.log(sum(math.exp(value - top) for value in logits))
        total += log_z - positive_logit

    return total / len(anchors)


def in_batch_negatives(embeddings, anchor_index):
    """Every other item in the batch is a negative.

    Free and extremely effective, and it carries the technique's most
    common quiet failure: some of these ARE positives that happen to share
    the batch. At a small temperature the gradient concentrates on exactly
    those, so the model is explicitly trained to separate things that
    belong together. The symptom is good held-out pair accuracy with poor
    retrieval, which usually gets misdiagnosed as an indexing problem.
    """
    return [
        embedding
        for other, embedding in enumerate(embeddings)
        if other != anchor_index
    ]


def info_nce_gradient(anchor, positive, negatives, temperature):
    """The gradient, because it explains the mechanism better than the loss.

        dL/dz_i = (1/tau) * [ sum_j p_ij * z_j  -  z_i+ ]

    Each anchor is pulled toward its positive with UNIT weight and pushed
    away from a softmax-weighted centroid of its negatives. The
    temperature controls only how peaked that weighting is:

      - high tau: all negatives contribute about equally. Stable, slow.
      - low tau: the nearest negative dominates. That negative is the most
        informative one AND the most likely to be a mislabelled positive.

    That single trade is the whole tension of the technique.
    """
    width = len(anchor)

    logits = [dot(anchor, positive) / temperature]
    for negative in negatives:
        logits.append(dot(anchor, negative) / temperature)

    top = max(logits)
    exps = [math.exp(value - top) for value in logits]
    total = sum(exps)
    probabilities = [value / total for value in exps]

    # Weighted centroid of the candidates, positive included.
    centroid = [0.0] * width
    candidates = [positive] + list(negatives)
    for weight, candidate in zip(probabilities, candidates):
        for k in range(width):
            centroid[k] += weight * candidate[k]

    return [
        (centroid[k] - positive[k]) / temperature for k in range(width)
    ]


def alignment_and_uniformity(anchors, positives, alpha=2.0, t=2.0):
    """Decompose the loss into two things you can actually diagnose.

    The loss value alone cannot distinguish collapse from convergence.
    These two can:

      alignment  -- mean squared distance between positive pairs. Lower is
                    better; it measures whether pairs are pulled together.
      uniformity -- log mean exp(-t * squared distance) over ALL pairs.
                    Lower (more negative) means better spread.

    Collapse shows as uniformity going to ~0 while the loss sits at
    log(batch_size) and looks completely healthy.
    """
    n_items = len(anchors)

    align = 0.0
    for idx in range(n_items):
        squared = sum(
            (anchors[idx][k] - positives[idx][k]) ** 2
            for k in range(len(anchors[idx]))
        )
        align += squared ** (alpha / 2.0)
    align /= n_items

    pair_total = 0.0
    pair_count = 0
    for left in range(n_items):
        for right in range(left + 1, n_items):
            squared = sum(
                (anchors[left][k] - anchors[right][k]) ** 2
                for k in range(len(anchors[left]))
            )
            pair_total += math.exp(-t * squared)
            pair_count += 1

    uniformity = math.log(pair_total / pair_count) if pair_count else 0.0
    return {"alignment": align, "uniformity": uniformity}


def retrieve(query, corpus, top_k):
    """Nearest-neighbour retrieval by exact search.

    Exact search here so the loss and the retrieval use provably the same
    metric. In production this becomes an approximate index, and the
    difference is not negligible: exact-search recall overstates what the
    served system does, sometimes substantially.
    """
    scored = [(dot(query, embedding), idx) for idx, embedding in enumerate(corpus)]
    scored.sort(reverse=True)
    return [idx for _, idx in scored[:top_k]]
`,
        profile:
          'Encoding is O(B·C) for encoder cost C and the similarity matrix adds O(B²·d), which is negligible until batch sizes reach the thousands and then becomes a real memory term at B² floats. Illustrative, not a measured benchmark: this version recomputes the log-sum-exp per anchor in Python and does exact retrieval, so it demonstrates the objective rather than any realistic cost.',
      },
      'make-it-right': {
        rationale:
          'The negative-sampling policy becomes an explicit protocol rather than an implicit loop, because the loss is defined relative to a candidate set and hiding the sampler in the data loader misrepresents where the modelling happens. Alignment and uniformity are returned alongside the loss rather than computed by a caller who remembers to, since collapse is invisible in the loss value and a diagnostic nobody assembles is a diagnostic nobody watches. Specific exceptions separate the failures that actually occur: collapse detected from mean pairwise similarity, a temperature outside the range where the gradient is numerically sane, and an embedding-metric mismatch between training and the index. The encoder and the index are given one shared normalization step so they cannot disagree about the metric, which is a silent production failure otherwise.',
        conventions: [
          'Explicit type hints on every public signature',
          'Dataclasses or NamedTuples over ad-hoc dicts',
          'Raise specific exceptions, never bare except',
          'Guard clauses over nested conditionals',
          'Context managers for resource cleanup',
        ],
        code: `"""Contrastive embeddings with the sampler as a declared component.

The design point: the loss is defined relative to a sampled candidate set,
so the sampler is part of the model. Hiding it in a data loader hides the
most consequential decision in the system. Here it is a protocol with a
name, and the two things it can get wrong -- too few negatives and false
negatives -- are both checkable.
"""

from __future__ import annotations

from contextlib import contextmanager
from dataclasses import dataclass
from typing import Final, Iterator, Protocol, Sequence

import numpy as np
from numpy.typing import NDArray

# Above this mean pairwise cosine, the embedding occupies a narrow cone and
# the geometry has effectively degenerated.
COLLAPSE_SIMILARITY: Final[float] = 0.9
MIN_TEMPERATURE: Final[float] = 1e-3


class RepresentationCollapse(RuntimeError):
    """Embeddings have converged to a narrow cone.

    The loss will NOT show this: it plateaus at log(batch_size) and looks
    like healthy convergence. Only mean pairwise similarity or a
    uniformity metric distinguishes the two, which is why both are
    computed here rather than left to the caller.
    """


class DegenerateTemperature(ValueError):
    """Temperature at or below zero, or small enough to overflow.

    The gradient scales with 1/tau, so a very small temperature both
    concentrates all the gradient on the nearest negative and makes the
    logits numerically unstable.
    """


class MetricMismatch(ValueError):
    """The index metric disagrees with the training metric.

    A silent production failure: an index configured for raw inner product
    over embeddings trained with cosine similarity degrades quietly rather
    than erroring, and the symptom looks like a quality regression.
    """


class TooFewNegatives(ValueError):
    """A candidate set small enough that the loss barely constrains anything.

    With in-batch negatives the batch size IS the negative count, which is
    why results at batch sizes in the thousands do not reproduce at a
    hundred: the larger batch is a harder problem, not a faster one.
    """


class NegativeSampler(Protocol):
    """Where the negatives come from.

    Declared as a protocol because this is the component that decides what
    the model learns. Two teams with the same encoder and different
    samplers have materially different systems.
    """

    @property
    def name(self) -> str:
        ...

    def candidates(
        self, embeddings: NDArray[np.float32], anchor: int
    ) -> NDArray[np.int32]:
        ...


@dataclass(frozen=True, slots=True)
class InBatchSampler:
    """Every other item in the batch. Free, effective, and quietly risky.

    Some of these candidates are genuine positives that happen to share
    the batch. At a small temperature the gradient concentrates on exactly
    those, so the model is trained to separate things that belong
    together. \`known_duplicates\` exists so a caller who can identify them
    is able to exclude them.
    """

    known_duplicates: tuple[tuple[int, int], ...] = ()

    @property
    def name(self) -> str:
        return "in-batch"

    def candidates(
        self, embeddings: NDArray[np.float32], anchor: int
    ) -> NDArray[np.int32]:
        excluded = {anchor}
        for left, right in self.known_duplicates:
            if left == anchor:
                excluded.add(right)
            elif right == anchor:
                excluded.add(left)
        return np.array(
            [idx for idx in range(embeddings.shape[0]) if idx not in excluded],
            dtype=np.int32,
        )


@dataclass(frozen=True, slots=True)
class MinedHardSampler:
    """Hard negatives mined from the current index, capped deliberately.

    The cap is the point. Ever-harder negatives improve the gradient right
    up until the hardest candidates are predominantly false negatives, and
    then the model is being trained to separate true positives. There is
    no way to detect that from the loss, so the share is bounded and the
    mined pairs are meant to be audited by eye.
    """

    hard_indices: tuple[tuple[int, ...], ...]
    max_hard_fraction: float = 0.5

    def __post_init__(self) -> None:
        if not 0.0 <= self.max_hard_fraction <= 1.0:
            raise ValueError(
                f"max_hard_fraction must lie in [0, 1], got {self.max_hard_fraction}"
            )

    @property
    def name(self) -> str:
        return f"mined-hard(cap={self.max_hard_fraction})"

    def candidates(
        self, embeddings: NDArray[np.float32], anchor: int
    ) -> NDArray[np.int32]:
        n_items = embeddings.shape[0]
        random_pool = [idx for idx in range(n_items) if idx != anchor]
        budget = int(len(random_pool) * self.max_hard_fraction)
        hard = [idx for idx in self.hard_indices[anchor] if idx != anchor][:budget]
        remaining = [idx for idx in random_pool if idx not in set(hard)]
        return np.array(hard + remaining[: len(random_pool) - len(hard)], dtype=np.int32)


@dataclass(frozen=True, slots=True)
class EmbeddingGeometry:
    """Alignment and uniformity, which the loss value conflates.

    Returned rather than computed on request, because a diagnostic that
    has to be assembled by hand does not get watched and this failure is
    silent in every other signal.
    """

    alignment: float
    uniformity: float
    mean_pairwise_similarity: float
    max_pairwise_similarity: float

    @property
    def has_collapsed(self) -> bool:
        return self.mean_pairwise_similarity > COLLAPSE_SIMILARITY

    def raise_if_collapsed(self) -> None:
        """Guard clause for a training loop that should stop now."""
        if not self.has_collapsed:
            return
        raise RepresentationCollapse(
            f"mean pairwise cosine {self.mean_pairwise_similarity:.3f} exceeds "
            f"{COLLAPSE_SIMILARITY}; uniformity {self.uniformity:.3f} -- the loss "
            "value will look healthy regardless"
        )


@dataclass(frozen=True, slots=True)
class ContrastiveResult:
    loss: float
    geometry: EmbeddingGeometry
    sampler_name: str
    negatives_per_anchor: int


class ContrastiveObjective:
    """InfoNCE with the sampler injected and the geometry reported."""

    def __init__(
        self,
        sampler: NegativeSampler,
        temperature: float = 0.07,
        min_negatives: int = 16,
    ) -> None:
        if temperature <= MIN_TEMPERATURE:
            raise DegenerateTemperature(
                f"temperature {temperature} at or below {MIN_TEMPERATURE}; the "
                "gradient scales with 1/tau and the logits will overflow"
            )
        self._sampler = sampler
        self._temperature = temperature
        self._min_negatives = min_negatives

    def __call__(
        self,
        anchors: NDArray[np.float32],
        positives: NDArray[np.float32],
    ) -> ContrastiveResult:
        # Guard clauses first, cheapest to most expensive.
        if anchors.shape != positives.shape:
            raise ValueError(
                f"anchor shape {anchors.shape} != positive shape {positives.shape}"
            )
        if anchors.shape[0] < 2:
            raise TooFewNegatives(
                f"batch of {anchors.shape[0]} leaves no negatives at all"
            )

        anchors = l2_normalize(anchors)
        positives = l2_normalize(positives)

        n_anchors = anchors.shape[0]
        total = 0.0
        negative_count = 0

        for anchor_index in range(n_anchors):
            candidates = self._sampler.candidates(anchors, anchor_index)
            if candidates.size < self._min_negatives:
                raise TooFewNegatives(
                    f"sampler {self._sampler.name} produced {candidates.size} "
                    f"negatives for anchor {anchor_index}, below "
                    f"{self._min_negatives}"
                )
            negative_count = candidates.size

            anchor = anchors[anchor_index]
            positive_logit = float(anchor @ positives[anchor_index])
            negative_logits = anchors[candidates] @ anchor

            logits = np.concatenate(
                ([positive_logit], negative_logits)
            ) / self._temperature
            shifted = logits - logits.max()
            log_z = float(np.log(np.exp(shifted).sum()) + logits.max())
            total += log_z - positive_logit / self._temperature

        return ContrastiveResult(
            loss=total / n_anchors,
            geometry=measure_geometry(anchors, positives),
            sampler_name=self._sampler.name,
            negatives_per_anchor=negative_count,
        )


def l2_normalize(embeddings: NDArray[np.float32]) -> NDArray[np.float32]:
    """Project onto the unit sphere. Shared by the loss AND the index.

    One function, used by both, so they cannot disagree about the metric --
    which is the silent production failure this guards against.
    """
    norms = np.linalg.norm(embeddings, axis=-1, keepdims=True)
    return embeddings / np.maximum(norms, 1e-12)


def measure_geometry(
    anchors: NDArray[np.float32],
    positives: NDArray[np.float32],
    alpha: float = 2.0,
    t: float = 2.0,
) -> EmbeddingGeometry:
    """Alignment, uniformity, and the two similarity statistics.

    Cheap enough to compute every step, and the only signal that separates
    a collapsed embedding from a converged one.
    """
    squared_positive = np.sum((anchors - positives) ** 2, axis=-1)
    alignment = float(np.mean(squared_positive ** (alpha / 2.0)))

    similarity = anchors @ anchors.T
    upper = np.triu_indices_from(similarity, k=1)
    pairwise_similarity = similarity[upper]

    squared_all = np.maximum(2.0 - 2.0 * pairwise_similarity, 0.0)
    uniformity = float(np.log(np.mean(np.exp(-t * squared_all))))

    return EmbeddingGeometry(
        alignment=alignment,
        uniformity=uniformity,
        mean_pairwise_similarity=float(np.mean(pairwise_similarity)),
        max_pairwise_similarity=float(np.max(pairwise_similarity)),
    )


@contextmanager
def embedding_index(
    corpus: NDArray[np.float32], metric: str = "cosine"
) -> Iterator[NDArray[np.float32]]:
    """Own the index for the duration of a query session, then release it.

    A context manager because the index is a real resource: it is
    frequently a memory-mapped file or an on-device buffer, and the version
    coupling matters -- a new encoder invalidates every stored embedding,
    so an index outliving its encoder is a correctness bug rather than a
    stale cache.
    """
    if metric != "cosine":
        raise MetricMismatch(
            f"index metric {metric!r} but embeddings are trained with cosine; "
            "an inner-product index over normalized vectors is equivalent, "
            "anything else degrades silently"
        )
    normalized = l2_normalize(corpus)
    try:
        yield normalized
    finally:
        del normalized


def retrieve(
    query: NDArray[np.float32],
    index: NDArray[np.float32],
    top_k: int,
) -> Sequence[int]:
    """Exact nearest neighbour, which overstates production recall.

    Kept exact here so the metric provably matches the loss. Anything
    serving at scale uses an approximate index, and the recall gap between
    the two is not negligible -- measure through the index that will
    actually serve.
    """
    if top_k <= 0:
        raise ValueError(f"top_k must be positive, got {top_k}")
    scores = index @ l2_normalize(query[None, :])[0]
    return np.argsort(-scores)[:top_k].tolist()
`,
        profile:
          'Same asymptotics as the naive version, with the per-anchor similarity computed as one matvec rather than a Python loop. Illustrative, not a measured benchmark: the substantive change is that a collapsed geometry now raises and the sampler is a named component, so the decision that dominates retrieval quality is visible in the call site instead of buried in a data loader.',
      },
      'make-it-fast': {
        rationale:
          'The per-anchor loop becomes one B-by-B similarity matrix and a single vectorized cross-entropy, which is the natural form of the objective — with in-batch negatives, every anchor’s candidate set is the same batch, so the whole loss is one masked softmax over a Gram matrix. That matrix is the memory cost of the technique at scale and is computed once and reused for the loss, the geometry diagnostics and the hard-negative mining rather than three times. Normalization is done in place on a contiguous float32 block so the matmul hits BLAS at full efficiency, the log-sum-exp is fused, and false negatives are excluded by additive masking rather than by rebuilding index arrays per anchor.',
        optimizations: [
          {
            technique: 'Vectorize to NumPy/BLAS (@, np.dot, einsum)',
            why: 'The whole loss becomes one Gram matrix and one masked softmax instead of a per-anchor loop of matvecs',
            tradeoff: 'Peak memory grows as the square of the batch size, which becomes the binding constraint at the batch sizes this loss actually wants',
          },
          {
            technique: 'Fuse adjacent operations so intermediates are never materialized',
            why: 'One similarity matrix serves the loss, the geometry metrics and hard-negative mining rather than being recomputed for each',
            tradeoff: 'The three consumers now share a mutable buffer, so the masking order matters and an in-place edit for one silently affects the others',
          },
          {
            technique: 'Ensure contiguous memory layout and a single dtype',
            why: 'Normalized embeddings form one contiguous float32 block, so the Gram matmul runs at full BLAS efficiency',
            tradeoff: 'A copy is required when the caller supplies a non-contiguous or mixed-precision view, which costs bandwidth on every step',
          },
          {
            technique: 'Pre-allocate output arrays and use in-place operations',
            why: 'The similarity matrix and mask are allocated once per batch shape and overwritten, so a training loop does no per-step allocation',
            tradeoff: 'The buffers are held at the largest batch shape seen, so memory does not shrink when a smaller batch follows a larger one',
          },
        ],
        code: `"""Contrastive embeddings as one Gram matrix and one masked softmax.

With in-batch negatives, every anchor's candidate set is the same batch.
So the natural form of the loss is not a loop over anchors at all -- it is
a single B x B similarity matrix, masked, then one row-wise cross-entropy
where the correct class for row i is column i.

That matrix is also the memory cost of the technique. It grows as B^2, and
since batch size is a CAPACITY parameter here rather than a throughput
knob -- a larger batch is a harder and better-estimated problem, not just
a faster one -- the B^2 term is what actually bounds how good the model
can get on given hardware. That is why memory banks and momentum encoders
exist: they add negatives without adding to this matrix.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Final

import numpy as np
from numpy.typing import NDArray

COLLAPSE_SIMILARITY: Final[float] = 0.9
MASK_VALUE: Final[float] = -1e4  # additive; float32-safe, unlike -inf


@dataclass(slots=True)
class ContrastiveBuffers:
    """Allocated once per batch shape and overwritten in place.

    Held at the largest shape seen, so memory does not shrink when a
    smaller batch follows a larger one -- an acceptable trade for a
    training loop that does no per-step allocation.
    """

    similarity: NDArray[np.float32]
    mask: NDArray[np.float32]
    row_max: NDArray[np.float32]
    log_z: NDArray[np.float32]

    @classmethod
    def for_batch(cls, max_batch: int) -> ContrastiveBuffers:
        return cls(
            similarity=np.empty((max_batch, 2 * max_batch), dtype=np.float32),
            mask=np.zeros((max_batch, 2 * max_batch), dtype=np.float32),
            row_max=np.empty(max_batch, dtype=np.float32),
            log_z=np.empty(max_batch, dtype=np.float32),
        )


def normalize_inplace(embeddings: NDArray[np.float32]) -> NDArray[np.float32]:
    """L2-normalize in place on a contiguous float32 block.

    Contiguity and a single dtype are not cosmetic here: the Gram matmul
    below is the dominant BLAS call, and a strided or mixed-precision input
    forces a copy on every step.
    """
    if embeddings.dtype != np.float32 or not embeddings.flags.c_contiguous:
        embeddings = np.ascontiguousarray(embeddings, dtype=np.float32)
    norms = np.linalg.norm(embeddings, axis=-1, keepdims=True)
    np.maximum(norms, 1e-12, out=norms)
    embeddings /= norms
    return embeddings


def info_nce(
    anchors: NDArray[np.float32],
    positives: NDArray[np.float32],
    buffers: ContrastiveBuffers,
    temperature: float = 0.07,
    false_negative_pairs: NDArray[np.int32] | None = None,
) -> tuple[float, NDArray[np.float32]]:
    """One Gram matrix, one masked softmax, one cross-entropy.

    Layout: column j of the similarity block is positive j for j < B, and
    anchor j-B for j >= B. So row i has its true positive at column i, and
    every other column -- both blocks -- is a negative. That single layout
    gives 2B-1 negatives per anchor from one B x 2B matmul.

    The returned matrix is reused by the geometry metrics and by
    hard-negative mining, which is the fusion that matters: recomputing it
    three times would triple the dominant cost.
    """
    if temperature <= 0.0:
        raise ValueError(f"temperature must be positive, got {temperature}")

    anchors = normalize_inplace(anchors)
    positives = normalize_inplace(positives)
    n_anchors = anchors.shape[0]

    similarity = buffers.similarity[:n_anchors, : 2 * n_anchors]
    np.matmul(anchors, positives.T, out=similarity[:, :n_anchors])
    np.matmul(anchors, anchors.T, out=similarity[:, n_anchors:])

    similarity /= np.float32(temperature)

    mask = buffers.mask[:n_anchors, : 2 * n_anchors]
    mask.fill(0.0)
    # An anchor against itself in the second block is not a negative, it is
    # the same vector: similarity 1 regardless of training.
    np.fill_diagonal(mask[:, n_anchors:], MASK_VALUE)

    # Known false negatives, masked additively rather than by rebuilding
    # index arrays per anchor. These are the candidates a small temperature
    # punishes hardest, so excluding the ones that can be identified is
    # the single highest-value correction available.
    if false_negative_pairs is not None and false_negative_pairs.size > 0:
        left = false_negative_pairs[:, 0]
        right = false_negative_pairs[:, 1]
        mask[left, right] = MASK_VALUE
        mask[right, left] = MASK_VALUE
        mask[left, n_anchors + right] = MASK_VALUE
        mask[right, n_anchors + left] = MASK_VALUE

    similarity += mask

    # Fused log-sum-exp: subtract the row max in place, then one log of one
    # sum rather than materializing exp() as a separate array.
    row_max = buffers.row_max[:n_anchors]
    np.max(similarity, axis=1, out=row_max)
    similarity -= row_max[:, None]

    log_z = buffers.log_z[:n_anchors]
    np.log(np.exp(similarity).sum(axis=1), out=log_z)

    # The correct class for row i is column i. No gather needed.
    positive_logits = np.diagonal(similarity[:, :n_anchors])
    loss = float(np.mean(log_z - positive_logits))

    return loss, similarity


def geometry_from_similarity(
    similarity: NDArray[np.float32],
    n_anchors: int,
    temperature: float,
    t: float = 2.0,
) -> dict[str, float]:
    """Alignment and uniformity from the matrix already computed.

    Reuses the shifted matrix rather than recomputing cosines, which is the
    whole point of passing it back: the geometry diagnostics are then
    nearly free and can run every step.

    Collapse shows as mean similarity near 1 and uniformity near 0 while
    the loss sits at log(2B-1) and looks entirely healthy. No other signal
    separates those two states.
    """
    anchor_block = similarity[:, n_anchors:] * np.float32(temperature)
    upper = np.triu_indices(n_anchors, k=1)
    pairwise = anchor_block[upper]

    squared = np.maximum(2.0 - 2.0 * pairwise, 0.0)
    uniformity = float(np.log(np.mean(np.exp(-t * squared))))

    positive_block = similarity[:, :n_anchors] * np.float32(temperature)
    positive_similarity = np.diagonal(positive_block)
    alignment = float(np.mean(np.maximum(2.0 - 2.0 * positive_similarity, 0.0)))

    mean_similarity = float(np.mean(pairwise))
    return {
        "alignment": alignment,
        "uniformity": uniformity,
        "mean_pairwise_similarity": mean_similarity,
        "collapsed": float(mean_similarity > COLLAPSE_SIMILARITY),
    }


def mine_hard_negatives(
    similarity: NDArray[np.float32],
    n_anchors: int,
    top_k: int,
    exclude_self: bool = True,
) -> NDArray[np.int32]:
    """The hardest in-batch negatives, from the same matrix again.

    Worth being explicit about what these are. They are the candidates the
    gradient already concentrates on at a small temperature, so mining
    them is mostly a way to find them for AUDIT rather than a way to
    increase their weight. Reading a sample of mined pairs by eye
    routinely finds a systematic false-negative pattern that no aggregate
    metric surfaces.
    """
    block = similarity[:, n_anchors:].copy()
    if exclude_self:
        np.fill_diagonal(block, MASK_VALUE)
    # argpartition rather than argsort: only the top-k boundary matters.
    partitioned = np.argpartition(-block, top_k, axis=1)[:, :top_k]
    return partitioned.astype(np.int32)


def batch_size_is_capacity(batch_size: int, embedding_dim: int) -> dict[str, float]:
    """What the B^2 term costs, and why memory banks exist.

    Illustrative arithmetic, not a benchmark. The ratio is the point: the
    similarity matrix overtakes the embedding block as the memory
    consumer once the batch exceeds the embedding dimension, and since a
    larger batch is a strictly harder problem for this loss, that crossover
    is where the technique stops scaling on-device and starts needing a
    memory bank or a momentum encoder to add negatives off the matrix.
    """
    embedding_bytes = float(batch_size) * embedding_dim * 4.0
    similarity_bytes = float(batch_size) * 2.0 * batch_size * 4.0
    return {
        "negatives_per_anchor": float(2 * batch_size - 1),
        "embedding_mib": embedding_bytes / (1024.0 ** 2),
        "similarity_mib": similarity_bytes / (1024.0 ** 2),
        "similarity_share": similarity_bytes / (embedding_bytes + similarity_bytes),
    }
`,
        profile:
          'The loss becomes one B-by-2B matmul plus a row-wise softmax, so encoder cost dominates again and the similarity term is O(B²·d) arithmetic against O(B²) memory. Illustrative, not a measured benchmark: that quadratic memory is the real ceiling, because batch size here is a capacity parameter rather than a throughput knob, and it is why memory banks exist to add negatives without adding to this matrix.',
      },
    },
    cpp: {
      'make-it-work': {
        code: `// InfoNCE contrastive embeddings, transcribed from the objective.
//
//     L = -mean_i log[ exp(sim(z_i, z_i+)/tau)
//                      / (exp(sim(z_i,z_i+)/tau) + sum_j exp(sim(z_i,z_j)/tau)) ]
//
// The thing to read for: the DENOMINATOR contains the negatives. The loss
// is defined relative to a candidate set rather than in absolute terms, so
// the same embedding is good or bad depending on what it is compared
// against. That is why the negative-sampling policy belongs in the model
// definition and not in the data loader.

#include <algorithm>
#include <cmath>
#include <cstddef>
#include <functional>
#include <vector>

namespace contrastive_naive {

float dot(const float* left, const float* right, std::size_t width) {
    float sum = 0.0F;
    for (std::size_t k = 0; k < width; ++k) {
        sum += left[k] * right[k];
    }
    return sum;
}

// Project onto the unit sphere.
//
// Not cosmetic. Normalization bounds every similarity to [-1, 1], which is
// what makes the temperature a meaningful scale rather than an arbitrary
// one, and it is the main structural defence against collapse.
void l2_normalize(float* vector, std::size_t width) {
    const float norm = std::sqrt(dot(vector, vector, width));
    if (norm < 1e-12F) {
        for (std::size_t k = 0; k < width; ++k) {
            vector[k] = 0.0F;
        }
        return;
    }
    for (std::size_t k = 0; k < width; ++k) {
        vector[k] /= norm;
    }
}

struct Encoder {
    std::size_t input_dim;
    std::size_t hidden_dim;
    std::size_t width;
    std::vector<float> w_hidden;  // hidden_dim x input_dim
    std::vector<float> w_out;     // width x hidden_dim
};

// The encoder is deliberately boring: one hidden layer and a projection.
//
// Everything consequential about this technique lives in the pairs and the
// negatives, not here. Swapping this for a transformer changes the quality
// and changes none of the reasoning below it.
void encode(const Encoder& encoder, const float* features, float* out) {
    std::vector<float> hidden(encoder.hidden_dim, 0.0F);
    for (std::size_t row = 0; row < encoder.hidden_dim; ++row) {
        const float value = dot(&encoder.w_hidden[row * encoder.input_dim], features,
                                encoder.input_dim);
        hidden[row] = value > 0.0F ? value : 0.0F;
    }
    for (std::size_t row = 0; row < encoder.width; ++row) {
        out[row] = dot(&encoder.w_out[row * encoder.hidden_dim], hidden.data(),
                       encoder.hidden_dim);
    }
    l2_normalize(out, encoder.width);
}

// The candidate set for one anchor, supplied as a callable.
//
// Passing the sampler as a function rather than a matrix is the honest
// signature: the sampling policy is an argument to the loss because it IS
// part of the loss.
using NegativeSampler =
    std::function<std::vector<std::size_t>(std::size_t anchor)>;

float info_nce_loss(const std::vector<float>& anchors,
                    const std::vector<float>& positives, std::size_t n_anchors,
                    std::size_t width, const NegativeSampler& negatives_for,
                    float temperature) {
    if (temperature <= 0.0F) {
        return 0.0F;
    }

    float total = 0.0F;
    std::vector<float> logits;

    for (std::size_t anchor = 0; anchor < n_anchors; ++anchor) {
        const float* query = anchors.data() + anchor * width;
        const float positive_logit =
            dot(query, positives.data() + anchor * width, width) / temperature;

        logits.clear();
        logits.push_back(positive_logit);
        for (const std::size_t negative : negatives_for(anchor)) {
            logits.push_back(dot(query, anchors.data() + negative * width, width) /
                             temperature);
        }

        // Log-sum-exp over positive AND negatives. The positive appears in
        // the denominator too: it is one candidate among many, and the loss
        // asks the model to pick it out.
        const float top = *std::max_element(logits.begin(), logits.end());
        float sum_exp = 0.0F;
        for (const float value : logits) {
            sum_exp += std::exp(value - top);
        }
        total += top + std::log(sum_exp) - positive_logit;
    }

    return total / static_cast<float>(n_anchors);
}

// Every other item in the batch is a negative.
//
// Free and extremely effective, and it carries the technique's most common
// quiet failure: some of these ARE positives that happen to share the
// batch. At a small temperature the gradient concentrates on exactly
// those, so the model is explicitly trained to separate things that belong
// together. The symptom is good held-out pair accuracy with poor
// retrieval, which usually gets misdiagnosed as an indexing problem.
std::vector<std::size_t> in_batch_negatives(std::size_t n_anchors,
                                            std::size_t anchor) {
    std::vector<std::size_t> candidates;
    candidates.reserve(n_anchors - 1);
    for (std::size_t other = 0; other < n_anchors; ++other) {
        if (other != anchor) {
            candidates.push_back(other);
        }
    }
    return candidates;
}

// The gradient, because it explains the mechanism better than the loss.
//
//     dL/dz_i = (1/tau) * [ sum_j p_ij * z_j  -  z_i+ ]
//
// Each anchor is pulled toward its positive with UNIT weight and pushed
// away from a softmax-weighted centroid of its negatives. The temperature
// controls only how peaked that weighting is:
//
//   - high tau: all negatives contribute about equally. Stable, slow.
//   - low tau: the nearest negative dominates. That negative is the most
//     informative one AND the most likely to be a mislabelled positive.
//
// That single trade is the whole tension of the technique.
std::vector<float> info_nce_gradient(const float* anchor, const float* positive,
                                     const std::vector<const float*>& negatives,
                                     std::size_t width, float temperature) {
    std::vector<float> logits;
    logits.push_back(dot(anchor, positive, width) / temperature);
    for (const float* negative : negatives) {
        logits.push_back(dot(anchor, negative, width) / temperature);
    }

    const float top = *std::max_element(logits.begin(), logits.end());
    float total = 0.0F;
    for (float& value : logits) {
        value = std::exp(value - top);
        total += value;
    }
    for (float& value : logits) {
        value /= total;
    }

    // Weighted centroid of the candidates, positive included.
    std::vector<float> centroid(width, 0.0F);
    for (std::size_t k = 0; k < width; ++k) {
        centroid[k] += logits[0] * positive[k];
    }
    for (std::size_t idx = 0; idx < negatives.size(); ++idx) {
        const float weight = logits[idx + 1];
        for (std::size_t k = 0; k < width; ++k) {
            centroid[k] += weight * negatives[idx][k];
        }
    }

    std::vector<float> gradient(width, 0.0F);
    for (std::size_t k = 0; k < width; ++k) {
        gradient[k] = (centroid[k] - positive[k]) / temperature;
    }
    return gradient;
}

struct Geometry {
    float alignment;
    float uniformity;
    float mean_pairwise_similarity;
};

// Decompose the loss into two things you can actually diagnose.
//
// The loss value alone cannot distinguish collapse from convergence.
// These two can:
//
//   alignment  -- mean squared distance between positive pairs. Lower
//                 means pairs are being pulled together.
//   uniformity -- log mean exp(-t * squared distance) over ALL pairs.
//                 More negative means better spread.
//
// Collapse shows as uniformity near 0 while the loss sits at
// log(batch_size) and looks completely healthy.
Geometry measure_geometry(const std::vector<float>& anchors,
                          const std::vector<float>& positives,
                          std::size_t n_anchors, std::size_t width, float t) {
    Geometry geometry{0.0F, 0.0F, 0.0F};

    for (std::size_t anchor = 0; anchor < n_anchors; ++anchor) {
        float squared = 0.0F;
        for (std::size_t k = 0; k < width; ++k) {
            const float delta = anchors[anchor * width + k] -
                                positives[anchor * width + k];
            squared += delta * delta;
        }
        geometry.alignment += squared;
    }
    geometry.alignment /= static_cast<float>(n_anchors);

    float pair_total = 0.0F;
    float similarity_total = 0.0F;
    std::size_t pair_count = 0;

    for (std::size_t left = 0; left < n_anchors; ++left) {
        for (std::size_t right = left + 1; right < n_anchors; ++right) {
            const float similarity = dot(anchors.data() + left * width,
                                         anchors.data() + right * width, width);
            const float squared = std::max(0.0F, 2.0F - 2.0F * similarity);
            pair_total += std::exp(-t * squared);
            similarity_total += similarity;
            ++pair_count;
        }
    }

    if (pair_count > 0) {
        geometry.uniformity =
            std::log(pair_total / static_cast<float>(pair_count));
        geometry.mean_pairwise_similarity =
            similarity_total / static_cast<float>(pair_count);
    }
    return geometry;
}

// Exact nearest-neighbour retrieval.
//
// Exact here so the loss and the retrieval provably use the same metric.
// In production this becomes an approximate index, and the difference is
// not negligible: exact-search recall overstates what the served system
// does, sometimes substantially.
std::vector<std::size_t> retrieve(const float* query,
                                  const std::vector<float>& corpus,
                                  std::size_t n_items, std::size_t width,
                                  std::size_t top_k) {
    std::vector<std::size_t> ranked(n_items, 0);
    for (std::size_t idx = 0; idx < n_items; ++idx) {
        ranked[idx] = idx;
    }

    const std::size_t keep = std::min(top_k, n_items);
    std::partial_sort(ranked.begin(), ranked.begin() + keep, ranked.end(),
                      [&](std::size_t left, std::size_t right) {
                          return dot(query, corpus.data() + left * width, width) >
                                 dot(query, corpus.data() + right * width, width);
                      });
    ranked.resize(keep);
    return ranked;
}

}  // namespace contrastive_naive
`,
        profile:
          'Encoding is O(B·C) for encoder cost C and the similarity work adds O(B²·d), which is negligible until batch sizes reach the thousands. Illustrative, not a measured benchmark: this version rebuilds the candidate vector per anchor and recomputes similarities inside the retrieval comparator, so it exists to be read against the objective rather than run.',
      },
      'make-it-right': {
        rationale:
          'The negative sampler becomes an abstract interface with a name, because the loss is defined relative to a candidate set and hiding the sampler in a data loader hides the decision that dominates retrieval quality. Every buffer is owned by the objective object so the hot path allocates nothing, and every view into one is a std::span, removing the pointer-and-length pairs that could disagree. The geometry diagnostics are returned with the loss rather than offered separately, since collapse is invisible in the loss value. Normalization lives in one place used by both the objective and the index, which is the fix for a metric mismatch that otherwise degrades retrieval silently, and the temperature is validated at construction because the gradient scales with its reciprocal.',
        conventions: [
          'RAII for every owned resource',
          'const-correctness on parameters and members',
          'std::span for non-owning views',
          'Fail fast on invalid input before any allocation',
          'No raw new/delete; std::vector and smart pointers instead',
        ],
        code: `// Contrastive embeddings with the sampler as a declared component.
//
// The design point: the loss is defined relative to a sampled candidate
// set, so the sampler is part of the model. Hiding it in a data loader
// hides the most consequential decision in the system. Here it is an
// interface with a name, and the two things it can get wrong -- too few
// negatives, and false negatives -- are both checkable.

#include <algorithm>
#include <cmath>
#include <cstddef>
#include <memory>
#include <numeric>
#include <span>
#include <stdexcept>
#include <string>
#include <string_view>
#include <vector>

namespace contrastive {

// Above this mean pairwise cosine, the embedding occupies a narrow cone
// and the geometry has effectively degenerated.
constexpr float kCollapseSimilarity = 0.9F;
constexpr float kMinTemperature = 1e-3F;

// Embeddings have converged to a narrow cone.
//
// The loss will NOT show this: it plateaus at log(batch_size) and looks
// like healthy convergence. Only mean pairwise similarity or a uniformity
// metric separates the two, which is why both are computed here rather
// than left to the caller.
class RepresentationCollapse : public std::runtime_error {
public:
    explicit RepresentationCollapse(const std::string& what)
        : std::runtime_error("representation collapse: " + what) {}
};

// Temperature at or below zero, or small enough to overflow. The gradient
// scales with 1/tau, so a very small temperature both concentrates all the
// gradient on the nearest negative and destabilizes the logits.
class DegenerateTemperature : public std::invalid_argument {
public:
    explicit DegenerateTemperature(const std::string& what)
        : std::invalid_argument("degenerate temperature: " + what) {}
};

// A candidate set small enough that the loss barely constrains anything.
// With in-batch negatives the batch size IS the negative count, which is
// why results at batch sizes in the thousands do not reproduce at a
// hundred: the larger batch is a harder problem, not a faster one.
class TooFewNegatives : public std::invalid_argument {
public:
    explicit TooFewNegatives(const std::string& what)
        : std::invalid_argument("too few negatives: " + what) {}
};

// The index metric disagrees with the training metric. A silent production
// failure: an inner-product index over unnormalized embeddings trained
// with cosine degrades quietly rather than erroring.
class MetricMismatch : public std::invalid_argument {
public:
    explicit MetricMismatch(const std::string& what)
        : std::invalid_argument("metric mismatch: " + what) {}
};

// Where the negatives come from.
//
// An interface because this is the component that decides what the model
// learns. Two teams with the same encoder and different samplers have
// materially different systems.
class NegativeSampler {
public:
    virtual ~NegativeSampler() = default;
    [[nodiscard]] virtual std::string_view name() const = 0;
    [[nodiscard]] virtual std::span<const std::size_t> candidates(
        std::size_t anchor, std::size_t n_anchors) = 0;
};

// Every other item in the batch. Free, effective, and quietly risky: some
// of these candidates are genuine positives sharing the batch, and a small
// temperature concentrates the gradient on exactly those.
class InBatchSampler final : public NegativeSampler {
public:
    explicit InBatchSampler(std::vector<std::pair<std::size_t, std::size_t>>
                                known_duplicates = {})
        : known_duplicates_(std::move(known_duplicates)) {}

    [[nodiscard]] std::string_view name() const override { return "in-batch"; }

    [[nodiscard]] std::span<const std::size_t> candidates(
        std::size_t anchor, std::size_t n_anchors) override {
        scratch_.clear();
        scratch_.reserve(n_anchors);

        for (std::size_t other = 0; other < n_anchors; ++other) {
            if (other == anchor || is_known_duplicate(anchor, other)) {
                continue;
            }
            scratch_.push_back(other);
        }
        return std::span<const std::size_t>(scratch_);
    }

private:
    [[nodiscard]] bool is_known_duplicate(std::size_t left,
                                          std::size_t right) const {
        return std::any_of(known_duplicates_.begin(), known_duplicates_.end(),
                           [left, right](const auto& pair) {
                               return (pair.first == left && pair.second == right) ||
                                      (pair.first == right && pair.second == left);
                           });
    }

    std::vector<std::pair<std::size_t, std::size_t>> known_duplicates_;
    std::vector<std::size_t> scratch_;
};

// Mined hard negatives, capped deliberately.
//
// The cap is the point. Ever-harder negatives improve the gradient right
// up until the hardest candidates are predominantly false negatives, and
// then the model is being trained to separate true positives. Nothing in
// the loss detects that, so the share is bounded and the mined pairs are
// meant to be read by eye.
class MinedHardSampler final : public NegativeSampler {
public:
    MinedHardSampler(std::vector<std::vector<std::size_t>> hard_indices,
                     float max_hard_fraction)
        : hard_indices_(std::move(hard_indices)),
          max_hard_fraction_(max_hard_fraction),
          label_("mined-hard(cap=" + std::to_string(max_hard_fraction) + ")") {
        if (max_hard_fraction < 0.0F || max_hard_fraction > 1.0F) {
            throw std::invalid_argument("max_hard_fraction must lie in [0, 1]");
        }
    }

    [[nodiscard]] std::string_view name() const override { return label_; }

    [[nodiscard]] std::span<const std::size_t> candidates(
        std::size_t anchor, std::size_t n_anchors) override {
        scratch_.clear();
        scratch_.reserve(n_anchors);

        const auto budget = static_cast<std::size_t>(
            static_cast<float>(n_anchors - 1) * max_hard_fraction_);

        for (const std::size_t hard : hard_indices_[anchor]) {
            if (scratch_.size() >= budget) {
                break;
            }
            if (hard != anchor) {
                scratch_.push_back(hard);
            }
        }

        for (std::size_t other = 0; other < n_anchors && scratch_.size() < n_anchors - 1;
             ++other) {
            if (other == anchor) {
                continue;
            }
            if (std::find(scratch_.begin(), scratch_.end(), other) == scratch_.end()) {
                scratch_.push_back(other);
            }
        }
        return std::span<const std::size_t>(scratch_);
    }

private:
    std::vector<std::vector<std::size_t>> hard_indices_;
    float max_hard_fraction_;
    std::string label_;
    std::vector<std::size_t> scratch_;
};

// Alignment and uniformity, which the loss value conflates.
class Geometry {
public:
    Geometry(float alignment, float uniformity, float mean_similarity,
             float max_similarity)
        : alignment_(alignment),
          uniformity_(uniformity),
          mean_similarity_(mean_similarity),
          max_similarity_(max_similarity) {}

    [[nodiscard]] bool has_collapsed() const noexcept {
        return mean_similarity_ > kCollapseSimilarity;
    }

    [[nodiscard]] float alignment() const noexcept { return alignment_; }
    [[nodiscard]] float uniformity() const noexcept { return uniformity_; }
    [[nodiscard]] float mean_similarity() const noexcept {
        return mean_similarity_;
    }
    [[nodiscard]] float max_similarity() const noexcept { return max_similarity_; }

    // Guard clause for a training loop that should stop now.
    void throw_if_collapsed() const {
        if (!has_collapsed()) {
            return;
        }
        throw RepresentationCollapse(
            "mean pairwise cosine " + std::to_string(mean_similarity_) +
            " exceeds " + std::to_string(kCollapseSimilarity) + ", uniformity " +
            std::to_string(uniformity_) +
            " -- the loss value will look healthy regardless");
    }

private:
    float alignment_;
    float uniformity_;
    float mean_similarity_;
    float max_similarity_;
};

struct Result {
    float loss;
    Geometry geometry;
    std::string_view sampler_name;
    std::size_t negatives_per_anchor;
};

// One place normalization happens, shared by the objective AND the index,
// so the two cannot disagree about the metric.
void l2_normalize(std::span<float> embeddings, std::size_t width) {
    const std::size_t n_items = embeddings.size() / width;
    for (std::size_t item = 0; item < n_items; ++item) {
        float* row = embeddings.data() + item * width;
        float norm = 0.0F;
        for (std::size_t k = 0; k < width; ++k) {
            norm += row[k] * row[k];
        }
        norm = std::sqrt(norm);
        if (norm < 1e-12F) {
            continue;
        }
        for (std::size_t k = 0; k < width; ++k) {
            row[k] /= norm;
        }
    }
}

// Rule of zero: every buffer is a vector member, nothing to leak.
class ContrastiveObjective {
public:
    ContrastiveObjective(std::unique_ptr<NegativeSampler> sampler, std::size_t width,
                         std::size_t max_batch, float temperature,
                         std::size_t min_negatives)
        : sampler_(std::move(sampler)),
          width_(width),
          temperature_(temperature),
          min_negatives_(min_negatives) {
        // Fail fast, before any buffer is sized.
        if (sampler_ == nullptr) {
            throw std::invalid_argument("sampler must not be null");
        }
        if (width == 0 || max_batch < 2) {
            throw std::invalid_argument("width must be positive, max_batch >= 2");
        }
        if (temperature <= kMinTemperature) {
            throw DegenerateTemperature(
                std::to_string(temperature) + " at or below " +
                std::to_string(kMinTemperature) +
                "; the gradient scales with 1/tau and the logits will overflow");
        }
        logits_.resize(max_batch + 1, 0.0F);
    }

    [[nodiscard]] Result operator()(std::span<float> anchors,
                                    std::span<float> positives) {
        if (anchors.size() != positives.size()) {
            throw std::invalid_argument("anchor and positive blocks differ in size");
        }
        const std::size_t n_anchors = anchors.size() / width_;
        if (n_anchors < 2) {
            throw TooFewNegatives("batch of " + std::to_string(n_anchors) +
                                  " leaves no negatives at all");
        }

        l2_normalize(anchors, width_);
        l2_normalize(positives, width_);

        float total = 0.0F;
        std::size_t negative_count = 0;

        for (std::size_t anchor = 0; anchor < n_anchors; ++anchor) {
            const std::span<const std::size_t> candidates =
                sampler_->candidates(anchor, n_anchors);
            if (candidates.size() < min_negatives_) {
                throw TooFewNegatives(
                    std::string(sampler_->name()) + " produced " +
                    std::to_string(candidates.size()) + " negatives for anchor " +
                    std::to_string(anchor) + ", below " +
                    std::to_string(min_negatives_));
            }
            negative_count = candidates.size();
            total += anchor_loss(anchors, positives, anchor, candidates);
        }

        return Result{total / static_cast<float>(n_anchors),
                      measure_geometry(anchors, positives, n_anchors),
                      sampler_->name(), negative_count};
    }

private:
    [[nodiscard]] float anchor_loss(std::span<const float> anchors,
                                    std::span<const float> positives,
                                    std::size_t anchor,
                                    std::span<const std::size_t> candidates) {
        const float* query = anchors.data() + anchor * width_;
        const float positive_logit =
            inner(query, positives.data() + anchor * width_) / temperature_;

        logits_[0] = positive_logit;
        for (std::size_t idx = 0; idx < candidates.size(); ++idx) {
            logits_[idx + 1] =
                inner(query, anchors.data() + candidates[idx] * width_) /
                temperature_;
        }

        const std::size_t count = candidates.size() + 1;
        const float top =
            *std::max_element(logits_.begin(), logits_.begin() + count);
        float sum_exp = 0.0F;
        for (std::size_t idx = 0; idx < count; ++idx) {
            sum_exp += std::exp(logits_[idx] - top);
        }
        return top + std::log(sum_exp) - positive_logit;
    }

    [[nodiscard]] float inner(const float* left, const float* right) const {
        float sum = 0.0F;
        for (std::size_t k = 0; k < width_; ++k) {
            sum += left[k] * right[k];
        }
        return sum;
    }

    [[nodiscard]] Geometry measure_geometry(std::span<const float> anchors,
                                            std::span<const float> positives,
                                            std::size_t n_anchors) const {
        float alignment = 0.0F;
        for (std::size_t anchor = 0; anchor < n_anchors; ++anchor) {
            float squared = 0.0F;
            for (std::size_t k = 0; k < width_; ++k) {
                const float delta = anchors[anchor * width_ + k] -
                                    positives[anchor * width_ + k];
                squared += delta * delta;
            }
            alignment += squared;
        }
        alignment /= static_cast<float>(n_anchors);

        float pair_total = 0.0F;
        float similarity_total = 0.0F;
        float max_similarity = -1.0F;
        std::size_t pair_count = 0;

        for (std::size_t left = 0; left < n_anchors; ++left) {
            for (std::size_t right = left + 1; right < n_anchors; ++right) {
                const float similarity = inner(anchors.data() + left * width_,
                                               anchors.data() + right * width_);
                const float squared = std::max(0.0F, 2.0F - 2.0F * similarity);
                pair_total += std::exp(-2.0F * squared);
                similarity_total += similarity;
                max_similarity = std::max(max_similarity, similarity);
                ++pair_count;
            }
        }

        const auto pairs = static_cast<float>(std::max<std::size_t>(pair_count, 1));
        return Geometry(alignment, std::log(pair_total / pairs),
                        similarity_total / pairs, max_similarity);
    }

    const std::unique_ptr<NegativeSampler> sampler_;
    const std::size_t width_;
    const float temperature_;
    const std::size_t min_negatives_;

    std::vector<float> logits_;
};

// Owns the corpus embeddings for the life of the index.
//
// RAII because the version coupling matters: a new encoder invalidates
// every stored embedding, so an index outliving its encoder is a
// correctness bug rather than a stale cache. Tying the lifetime to an
// object makes that failure structural rather than procedural.
class EmbeddingIndex {
public:
    EmbeddingIndex(std::vector<float> corpus, std::size_t width,
                   std::string_view metric, std::string encoder_version)
        : corpus_(std::move(corpus)),
          width_(width),
          encoder_version_(std::move(encoder_version)) {
        if (metric != "cosine") {
            throw MetricMismatch(
                std::string(metric) +
                " but embeddings are trained with cosine; an inner-product "
                "index over normalized vectors is equivalent, anything else "
                "degrades silently");
        }
        if (width == 0 || corpus_.size() % width != 0) {
            throw std::invalid_argument("corpus size is not a multiple of width");
        }
        l2_normalize(std::span<float>(corpus_), width_);
    }

    [[nodiscard]] std::vector<std::size_t> retrieve(std::span<const float> query,
                                                    std::size_t top_k) const {
        const std::size_t n_items = corpus_.size() / width_;
        std::vector<std::size_t> ranked(n_items, 0);
        std::iota(ranked.begin(), ranked.end(), 0);

        const std::size_t keep = std::min(top_k, n_items);
        std::partial_sort(ranked.begin(), ranked.begin() + keep, ranked.end(),
                          [this, query](std::size_t left, std::size_t right) {
                              return score(query, left) > score(query, right);
                          });
        ranked.resize(keep);
        return ranked;
    }

    [[nodiscard]] std::string_view encoder_version() const noexcept {
        return encoder_version_;
    }

private:
    [[nodiscard]] float score(std::span<const float> query,
                              std::size_t item) const {
        float sum = 0.0F;
        for (std::size_t k = 0; k < width_; ++k) {
            sum += query[k] * corpus_[item * width_ + k];
        }
        return sum;
    }

    std::vector<float> corpus_;
    const std::size_t width_;
    const std::string encoder_version_;
};

}  // namespace contrastive
`,
        profile:
          'Same asymptotics as the naive version with the logit buffer hoisted to construction, so the per-call cost is arithmetic rather than allocator traffic. Illustrative, not a measured benchmark: the substantive change is that a collapsed geometry throws, the sampler is a named component, and the index refuses a metric that disagrees with training instead of degrading quietly.',
      },
      'make-it-fast': {
        rationale:
          'The per-anchor loop collapses into one GEMM: with in-batch negatives every anchor shares the same candidate set, so the whole loss is a single similarity matrix over the batch followed by a row-wise cross-entropy where the correct column for row i is column i. That matrix is computed once and reused by the loss, the geometry diagnostics and hard-negative mining rather than three times, which is the fusion that matters since it is the dominant cost. False negatives are excluded by an additive mask rather than by rebuilding candidate vectors, the log-sum-exp is fused into one pass per row, and OpenMP parallelizes the row reduction because the rows are independent once the matrix exists.',
        optimizations: [
          {
            technique: 'Delegate the inner kernel to a tuned BLAS',
            why: 'The entire similarity structure becomes one GEMM over the batch instead of a matvec per anchor-candidate pair',
            tradeoff: 'Peak memory grows as the square of the batch size, which becomes the binding constraint precisely at the batch sizes this loss wants',
          },
          {
            technique: 'Loop fusion to eliminate intermediate buffers',
            why: 'One similarity matrix serves the loss, the geometry metrics and hard-negative mining rather than being rebuilt for each',
            tradeoff: 'Three consumers share a mutable buffer, so the masking order matters and an in-place edit for one silently affects the others',
          },
          {
            technique: 'Row-major, cache-friendly memory layout',
            why: 'Embeddings and the similarity matrix are both row-major, so each row reduction streams sequentially',
            tradeoff: 'Column-wise access for the transposed block strides badly, so anything needing it must work from an explicit transpose',
          },
          {
            technique: 'OpenMP for data-parallel loops',
            why: 'Row reductions are independent once the matrix exists, so the softmax and loss accumulate concurrently',
            tradeoff: 'Only worthwhile above a few hundred rows; below that the barrier costs more than the reduction and BLAS must be pinned to one thread',
          },
        ],
        code: `// Contrastive embeddings as one Gram matrix and one masked softmax.
//
// With in-batch negatives, every anchor's candidate set is the same batch.
// So the natural form of the loss is not a loop over anchors at all -- it
// is a single B x 2B similarity matrix, masked, then one row-wise
// cross-entropy where the correct class for row i is column i.
//
// That matrix is also the memory cost of the technique. It grows as B^2,
// and since batch size here is a CAPACITY parameter rather than a
// throughput knob -- a larger batch is a harder and better-estimated
// problem, not merely a faster one -- the B^2 term is what actually bounds
// how good the model can get on given hardware. That is why memory banks
// and momentum encoders exist: they add negatives without adding to this
// matrix.
//
// Build: g++ -O3 -march=native -fopenmp -Wall -Wextra -Wpedantic

#include <algorithm>
#include <cmath>
#include <cstddef>
#include <numeric>
#include <span>
#include <vector>

#include <cblas.h>
#include <omp.h>

namespace contrastive_fast {

constexpr float kCollapseSimilarity = 0.9F;
// Additive and float32-safe, unlike -inf which poisons the row max.
constexpr float kMaskValue = -1e4F;

// Allocated once per batch shape and overwritten in place, so a training
// loop performs no per-step allocation. Held at the largest shape seen.
struct Buffers {
    std::vector<float> similarity;  // max_batch x (2 * max_batch)
    std::vector<float> mask;
    std::vector<float> row_max;
    std::vector<float> log_z;
    std::size_t max_batch;

    Buffers(std::size_t batch)
        : similarity(batch * 2 * batch, 0.0F),
          mask(batch * 2 * batch, 0.0F),
          row_max(batch, 0.0F),
          log_z(batch, 0.0F),
          max_batch(batch) {}
};

// L2-normalize a contiguous row-major block. Shared by the loss and the
// index so the two cannot disagree about the metric.
void normalize_rows(std::span<float> embeddings, std::size_t n_rows,
                    std::size_t width) {
    for (std::size_t row = 0; row < n_rows; ++row) {
        float* values = embeddings.data() + row * width;
        const float norm =
            std::sqrt(cblas_sdot(static_cast<blasint>(width), values, 1, values, 1));
        if (norm < 1e-12F) {
            continue;
        }
        cblas_sscal(static_cast<blasint>(width), 1.0F / norm, values, 1);
    }
}

struct Geometry {
    float alignment;
    float uniformity;
    float mean_similarity;
    bool collapsed;
};

// One GEMM pair, one masked softmax, one cross-entropy.
//
// Layout: column j is positive j for j < B, and anchor j-B for j >= B. So
// row i has its true positive at column i, and every other column in both
// blocks is a negative. That single layout yields 2B-1 negatives per
// anchor from two B x B matmuls.
float info_nce(std::span<float> anchors, std::span<float> positives,
               std::size_t n_anchors, std::size_t width, float temperature,
               std::span<const std::size_t> false_negative_pairs,
               Buffers& buffers) {
    if (temperature <= 0.0F || n_anchors < 2 || n_anchors > buffers.max_batch) {
        return 0.0F;
    }

    normalize_rows(anchors, n_anchors, width);
    normalize_rows(positives, n_anchors, width);

    const std::size_t stride = 2 * n_anchors;
    float* similarity = buffers.similarity.data();
    float* mask = buffers.mask.data();

    const auto rows = static_cast<blasint>(n_anchors);
    const auto width_i = static_cast<blasint>(width);
    const auto stride_i = static_cast<blasint>(stride);

    // Anchors against positives -- the left block.
    cblas_sgemm(CblasRowMajor, CblasNoTrans, CblasTrans, rows, rows, width_i,
                1.0F / temperature, anchors.data(), width_i, positives.data(),
                width_i, 0.0F, similarity, stride_i);
    // Anchors against anchors -- the right block.
    cblas_sgemm(CblasRowMajor, CblasNoTrans, CblasTrans, rows, rows, width_i,
                1.0F / temperature, anchors.data(), width_i, anchors.data(),
                width_i, 0.0F, similarity + n_anchors, stride_i);

    std::fill_n(mask, n_anchors * stride, 0.0F);
    // An anchor against itself in the right block is not a negative, it is
    // the same vector: similarity 1 regardless of training.
    for (std::size_t row = 0; row < n_anchors; ++row) {
        mask[row * stride + n_anchors + row] = kMaskValue;
    }

    // Known false negatives, masked additively rather than by rebuilding
    // candidate vectors. These are what a small temperature punishes
    // hardest, so excluding the identifiable ones is the highest-value
    // correction available here.
    for (std::size_t pair = 0; pair + 1 < false_negative_pairs.size(); pair += 2) {
        const std::size_t left = false_negative_pairs[pair];
        const std::size_t right = false_negative_pairs[pair + 1];
        if (left >= n_anchors || right >= n_anchors) {
            continue;
        }
        mask[left * stride + right] = kMaskValue;
        mask[right * stride + left] = kMaskValue;
        mask[left * stride + n_anchors + right] = kMaskValue;
        mask[right * stride + n_anchors + left] = kMaskValue;
    }

    float total = 0.0F;

    // Rows are independent once the matrix exists. Worth parallelizing
    // only above a few hundred rows; below that the barrier costs more
    // than the reduction, and OPENBLAS_NUM_THREADS must be 1 either way.
#pragma omp parallel for reduction(+ : total) schedule(static)
    for (std::ptrdiff_t row = 0; row < static_cast<std::ptrdiff_t>(n_anchors);
         ++row) {
        const auto index = static_cast<std::size_t>(row);
        float* scores = similarity + index * stride;
        const float* row_mask = mask + index * stride;

        // Fused: apply the mask, find the max, and accumulate exp in the
        // fewest passes the numerics allow.
        float top = kMaskValue;
        for (std::size_t col = 0; col < stride; ++col) {
            scores[col] += row_mask[col];
            top = std::max(top, scores[col]);
        }

        float sum_exp = 0.0F;
        for (std::size_t col = 0; col < stride; ++col) {
            sum_exp += std::exp(scores[col] - top);
        }

        // The correct class for row i is column i. No gather needed.
        total += top + std::log(sum_exp) - scores[index];
    }

    return total / static_cast<float>(n_anchors);
}

// Alignment and uniformity from the matrix already computed.
//
// Reuses the masked matrix rather than recomputing cosines, which is the
// point of keeping it: the diagnostics become nearly free and can run
// every step. Collapse shows as mean similarity near 1 and uniformity
// near 0 while the loss sits at log(2B-1) and looks entirely healthy.
Geometry geometry_from_similarity(const Buffers& buffers, std::size_t n_anchors,
                                  float temperature) {
    const std::size_t stride = 2 * n_anchors;
    const float* similarity = buffers.similarity.data();

    float alignment = 0.0F;
    for (std::size_t row = 0; row < n_anchors; ++row) {
        const float cosine = similarity[row * stride + row] * temperature;
        alignment += std::max(0.0F, 2.0F - 2.0F * cosine);
    }
    alignment /= static_cast<float>(n_anchors);

    float pair_total = 0.0F;
    float similarity_total = 0.0F;
    std::size_t pair_count = 0;

    for (std::size_t left = 0; left < n_anchors; ++left) {
        for (std::size_t right = left + 1; right < n_anchors; ++right) {
            const float cosine =
                similarity[left * stride + n_anchors + right] * temperature;
            const float squared = std::max(0.0F, 2.0F - 2.0F * cosine);
            pair_total += std::exp(-2.0F * squared);
            similarity_total += cosine;
            ++pair_count;
        }
    }

    const auto pairs = static_cast<float>(std::max<std::size_t>(pair_count, 1));
    const float mean_similarity = similarity_total / pairs;

    return Geometry{alignment, std::log(pair_total / pairs), mean_similarity,
                    mean_similarity > kCollapseSimilarity};
}

// The hardest in-batch negatives, from the same matrix again.
//
// Worth being explicit about what these are. They are the candidates the
// gradient already concentrates on at a small temperature, so mining them
// is mostly a way to find them for AUDIT rather than a way to increase
// their weight. Reading a sample of mined pairs by eye routinely surfaces
// a systematic false-negative pattern no aggregate metric reports.
std::vector<std::size_t> mine_hard_negatives(const Buffers& buffers,
                                             std::size_t n_anchors,
                                             std::size_t top_k) {
    const std::size_t stride = 2 * n_anchors;
    const float* similarity = buffers.similarity.data();
    const std::size_t keep = std::min(top_k, n_anchors - 1);

    std::vector<std::size_t> mined;
    mined.reserve(n_anchors * keep);
    std::vector<std::size_t> ranked(n_anchors, 0);

    for (std::size_t row = 0; row < n_anchors; ++row) {
        std::iota(ranked.begin(), ranked.end(), 0);
        const float* scores = similarity + row * stride + n_anchors;

        // nth_element rather than a full sort: only the top-k boundary
        // matters, and k is small against the batch size.
        std::nth_element(ranked.begin(), ranked.begin() + keep, ranked.end(),
                         [scores, row](std::size_t left, std::size_t right) {
                             if (left == row) {
                                 return false;
                             }
                             if (right == row) {
                                 return true;
                             }
                             return scores[left] > scores[right];
                         });
        mined.insert(mined.end(), ranked.begin(), ranked.begin() + keep);
    }
    return mined;
}

struct MemoryCost {
    float negatives_per_anchor;
    float embedding_mib;
    float similarity_mib;
    float similarity_share;
};

// What the B^2 term costs, and why memory banks exist.
//
// Illustrative arithmetic, not a benchmark. The ratio is the point: the
// similarity matrix overtakes the embedding block once the batch exceeds
// the embedding dimension, and since a larger batch is a strictly harder
// problem for this loss, that crossover is where the technique stops
// scaling on-device and starts needing negatives held off the matrix.
MemoryCost memory_cost(std::size_t batch_size, std::size_t width) {
    const auto embedding_bytes =
        static_cast<float>(batch_size) * static_cast<float>(width) * 4.0F;
    const auto similarity_bytes =
        static_cast<float>(batch_size) * 2.0F * static_cast<float>(batch_size) * 4.0F;
    const float mib = 1024.0F * 1024.0F;

    return MemoryCost{static_cast<float>(2 * batch_size - 1),
                      embedding_bytes / mib, similarity_bytes / mib,
                      similarity_bytes / (embedding_bytes + similarity_bytes)};
}

}  // namespace contrastive_fast
`,
        profile:
          'The loss becomes two B-by-B GEMMs plus a row-wise softmax, so encoder cost dominates again and the similarity term is O(B²·d) arithmetic against O(B²) memory. Illustrative, not a measured benchmark: that quadratic memory is the real ceiling, since batch size here is a capacity parameter rather than a throughput knob, and it is why memory banks exist to add negatives without adding to this matrix.',
      },
    },
    rust: {
      'make-it-work': {
        code: `//! InfoNCE contrastive embeddings, transcribed from the objective.
//!
//!     L = -mean_i log[ exp(sim(z_i, z_i+)/tau)
//!                      / (exp(sim(z_i,z_i+)/tau) + sum_j exp(sim(z_i,z_j)/tau)) ]
//!
//! The thing to read for: the DENOMINATOR contains the negatives. The loss
//! is defined relative to a candidate set rather than in absolute terms,
//! so the same embedding is good or bad depending on what it is compared
//! against. That is why the negative-sampling policy belongs in the model
//! definition and not in the data loader.

pub struct Encoder {
    pub input_dim: usize,
    pub hidden_dim: usize,
    pub width: usize,
    pub w_hidden: Vec<f32>, // hidden_dim * input_dim
    pub w_out: Vec<f32>,    // width * hidden_dim
}

fn dot(left: &[f32], right: &[f32]) -> f32 {
    let mut sum = 0.0;
    for k in 0..left.len() {
        sum += left[k] * right[k];
    }
    sum
}

/// Project onto the unit sphere.
///
/// Not cosmetic. Normalization bounds every similarity to [-1, 1], which
/// is what makes the temperature a meaningful scale rather than an
/// arbitrary one, and it is the main structural defence against collapse.
fn l2_normalize(vector: &mut [f32]) {
    let norm = dot(vector, vector).sqrt();
    if norm < 1e-12 {
        for value in vector.iter_mut() {
            *value = 0.0;
        }
        return;
    }
    for value in vector.iter_mut() {
        *value /= norm;
    }
}

/// The encoder is deliberately boring: one hidden layer and a projection.
///
/// Everything consequential about this technique lives in the pairs and
/// the negatives, not here. Swapping this for a transformer changes the
/// quality and changes none of the reasoning below it.
pub fn encode(encoder: &Encoder, features: &[f32], out: &mut [f32]) {
    let mut hidden = vec![0.0f32; encoder.hidden_dim];
    for row in 0..encoder.hidden_dim {
        let weights =
            &encoder.w_hidden[row * encoder.input_dim..(row + 1) * encoder.input_dim];
        let value = dot(weights, features);
        hidden[row] = if value > 0.0 { value } else { 0.0 };
    }
    for row in 0..encoder.width {
        let weights =
            &encoder.w_out[row * encoder.hidden_dim..(row + 1) * encoder.hidden_dim];
        out[row] = dot(weights, &hidden);
    }
    l2_normalize(out);
}

/// The loss, one anchor at a time.
///
/// \`negatives_for\` returns the candidate set for a given anchor. Taking it
/// as a closure rather than as a matrix is the honest signature: the
/// sampling policy is an argument to the loss because it IS part of the
/// loss.
pub fn info_nce_loss(
    anchors: &[f32],
    positives: &[f32],
    n_anchors: usize,
    width: usize,
    temperature: f32,
    negatives_for: &dyn Fn(usize) -> Vec<usize>,
) -> f32 {
    if temperature <= 0.0 {
        return 0.0;
    }

    let mut total = 0.0;

    for anchor in 0..n_anchors {
        let query = &anchors[anchor * width..(anchor + 1) * width];
        let positive = &positives[anchor * width..(anchor + 1) * width];
        let positive_logit = dot(query, positive) / temperature;

        let mut logits = vec![positive_logit];
        for negative in negatives_for(anchor) {
            let candidate = &anchors[negative * width..(negative + 1) * width];
            logits.push(dot(query, candidate) / temperature);
        }

        // Log-sum-exp over positive AND negatives. The positive appears in
        // the denominator too: it is one candidate among many, and the loss
        // asks the model to pick it out.
        let mut top = f32::NEG_INFINITY;
        for value in &logits {
            if *value > top {
                top = *value;
            }
        }
        let mut sum_exp = 0.0;
        for value in &logits {
            sum_exp += (*value - top).exp();
        }
        total += top + sum_exp.ln() - positive_logit;
    }

    total / n_anchors as f32
}

/// Every other item in the batch is a negative.
///
/// Free and extremely effective, and it carries the technique's most
/// common quiet failure: some of these ARE positives that happen to share
/// the batch. At a small temperature the gradient concentrates on exactly
/// those, so the model is explicitly trained to separate things that
/// belong together. The symptom is good held-out pair accuracy with poor
/// retrieval, which usually gets misdiagnosed as an indexing problem.
pub fn in_batch_negatives(n_anchors: usize, anchor: usize) -> Vec<usize> {
    let mut candidates = Vec::with_capacity(n_anchors - 1);
    for other in 0..n_anchors {
        if other != anchor {
            candidates.push(other);
        }
    }
    candidates
}

/// The gradient, because it explains the mechanism better than the loss.
///
///     dL/dz_i = (1/tau) * [ sum_j p_ij * z_j  -  z_i+ ]
///
/// Each anchor is pulled toward its positive with UNIT weight and pushed
/// away from a softmax-weighted centroid of its negatives. The temperature
/// controls only how peaked that weighting is:
///
///   - high tau: all negatives contribute about equally. Stable, slow.
///   - low tau: the nearest negative dominates. That negative is the most
///     informative one AND the most likely to be a mislabelled positive.
///
/// That single trade is the whole tension of the technique.
pub fn info_nce_gradient(
    anchor: &[f32],
    positive: &[f32],
    negatives: &[&[f32]],
    temperature: f32,
) -> Vec<f32> {
    let width = anchor.len();

    let mut logits = vec![dot(anchor, positive) / temperature];
    for negative in negatives {
        logits.push(dot(anchor, negative) / temperature);
    }

    let mut top = f32::NEG_INFINITY;
    for value in &logits {
        if *value > top {
            top = *value;
        }
    }
    let mut total = 0.0;
    for value in logits.iter_mut() {
        *value = (*value - top).exp();
        total += *value;
    }
    for value in logits.iter_mut() {
        *value /= total;
    }

    // Weighted centroid of the candidates, positive included.
    let mut centroid = vec![0.0f32; width];
    for k in 0..width {
        centroid[k] += logits[0] * positive[k];
    }
    for (idx, negative) in negatives.iter().enumerate() {
        let weight = logits[idx + 1];
        for k in 0..width {
            centroid[k] += weight * negative[k];
        }
    }

    let mut gradient = vec![0.0f32; width];
    for k in 0..width {
        gradient[k] = (centroid[k] - positive[k]) / temperature;
    }
    gradient
}

pub struct Geometry {
    pub alignment: f32,
    pub uniformity: f32,
    pub mean_pairwise_similarity: f32,
}

/// Decompose the loss into two things you can actually diagnose.
///
/// The loss value alone cannot distinguish collapse from convergence.
/// These two can:
///
///   alignment  -- mean squared distance between positive pairs. Lower
///                 means pairs are being pulled together.
///   uniformity -- log mean exp(-t * squared distance) over ALL pairs.
///                 More negative means better spread.
///
/// Collapse shows as uniformity near 0 while the loss sits at
/// ln(batch_size) and looks completely healthy.
pub fn measure_geometry(
    anchors: &[f32],
    positives: &[f32],
    n_anchors: usize,
    width: usize,
    t: f32,
) -> Geometry {
    let mut alignment = 0.0;
    for anchor in 0..n_anchors {
        let mut squared = 0.0;
        for k in 0..width {
            let delta = anchors[anchor * width + k] - positives[anchor * width + k];
            squared += delta * delta;
        }
        alignment += squared;
    }
    alignment /= n_anchors as f32;

    let mut pair_total = 0.0;
    let mut similarity_total = 0.0;
    let mut pair_count = 0usize;

    for left in 0..n_anchors {
        for right in (left + 1)..n_anchors {
            let similarity = dot(
                &anchors[left * width..(left + 1) * width],
                &anchors[right * width..(right + 1) * width],
            );
            let squared = (2.0 - 2.0 * similarity).max(0.0);
            pair_total += (-t * squared).exp();
            similarity_total += similarity;
            pair_count += 1;
        }
    }

    let pairs = pair_count.max(1) as f32;
    Geometry {
        alignment,
        uniformity: (pair_total / pairs).ln(),
        mean_pairwise_similarity: similarity_total / pairs,
    }
}

/// Exact nearest-neighbour retrieval.
///
/// Exact here so the loss and the retrieval provably use the same metric.
/// In production this becomes an approximate index, and the difference is
/// not negligible: exact-search recall overstates what the served system
/// does, sometimes substantially.
pub fn retrieve(
    query: &[f32],
    corpus: &[f32],
    n_items: usize,
    width: usize,
    top_k: usize,
) -> Vec<usize> {
    let mut scored: Vec<(f32, usize)> = (0..n_items)
        .map(|idx| {
            (
                dot(query, &corpus[idx * width..(idx + 1) * width]),
                idx,
            )
        })
        .collect();

    scored.sort_by(|left, right| {
        right.0.partial_cmp(&left.0).unwrap_or(std::cmp::Ordering::Equal)
    });
    scored.truncate(top_k.min(n_items));
    scored.into_iter().map(|(_, idx)| idx).collect()
}
`,
        profile:
          'Encoding is O(B·C) for encoder cost C and the similarity work adds O(B²·d), which is negligible until batch sizes reach the thousands. Illustrative, not a measured benchmark: this version allocates a candidate vector and a logit vector per anchor and sorts the full corpus for retrieval, so it exists to be read against the objective rather than run.',
      },
      'make-it-right': {
        rationale:
          'The negative sampler becomes a trait with a name, because the loss is defined relative to a candidate set and hiding the sampler in a data loader hides the decision that dominates retrieval quality. Newtypes separate the quantities that are all usize and all silently interchangeable here — a batch position, an embedding dimension and a corpus id — and a newtype also carries the encoder version so that an index built by one encoder cannot be queried with another, which is a correctness bug rather than a stale cache. Every recoverable failure becomes a Result variant naming the values that caused it: collapse detected from mean pairwise similarity, a temperature small enough to destabilize a gradient that scales with its reciprocal, a candidate set too small to constrain anything, and a metric mismatch between training and the index.',
        conventions: [
          'Result<T, E> over panics for recoverable errors',
          'Newtypes for units and dimensions',
          'Validate inputs at the constructor boundary',
          'Borrow rather than clone; take &[T] not Vec<T>',
          'Iterator chains over manual index loops',
        ],
        code: `//! Contrastive embeddings with the sampler as a declared component.
//!
//! The design point: the loss is defined relative to a sampled candidate
//! set, so the sampler is part of the model. Hiding it in a data loader
//! hides the most consequential decision in the system. Here it is a
//! trait with a name, and the two things it can get wrong -- too few
//! negatives, and false negatives -- are both checkable.
//!
//! The other design point is the encoder version. A new encoder
//! invalidates every stored embedding, so an index outliving its encoder
//! is a correctness bug rather than a stale cache. Carrying the version in
//! a newtype makes mixing two generations a type error instead of a silent
//! quality regression.

use std::fmt;

/// Above this mean pairwise cosine, the embedding occupies a narrow cone
/// and the geometry has effectively degenerated.
const COLLAPSE_SIMILARITY: f32 = 0.9;
const MIN_TEMPERATURE: f32 = 1e-3;

/// A position within the current batch.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct BatchPos(pub usize);

/// An id in the indexed corpus. Distinct from BatchPos, which is the
/// confusion that silently retrieves the wrong item rather than panicking.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct CorpusId(pub usize);

/// The embedding dimension.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct EmbeddingDim(pub usize);

/// Which encoder produced an embedding. Mixing two in one index yields
/// nonsense with no error anywhere, so it travels with the data.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct EncoderVersion(pub String);

#[derive(Debug)]
pub enum ContrastiveError {
    /// Embeddings have converged to a narrow cone.
    ///
    /// The loss will NOT show this: it plateaus at ln(batch_size) and
    /// looks like healthy convergence. Only mean pairwise similarity or a
    /// uniformity metric separates the two.
    RepresentationCollapse { mean_similarity: f32, uniformity: f32 },
    /// Temperature small enough to overflow the logits. The gradient
    /// scales with 1/tau, so a tiny temperature both concentrates all the
    /// gradient on the nearest negative and destabilizes the arithmetic.
    DegenerateTemperature { temperature: f32 },
    /// A candidate set too small to constrain anything. With in-batch
    /// negatives the batch size IS the negative count, which is why
    /// results at batch sizes in the thousands do not reproduce at a
    /// hundred: the larger batch is a harder problem, not a faster one.
    TooFewNegatives { found: usize, required: usize, sampler: String },
    /// The index metric disagrees with the training metric. Otherwise a
    /// silent failure that looks like a quality regression.
    MetricMismatch { index_metric: String },
    /// An index built by one encoder queried with an embedding from
    /// another. A correctness bug, not a stale cache.
    EncoderVersionMismatch { index: EncoderVersion, query: EncoderVersion },
    /// Embedding buffer length is not a multiple of the dimension.
    RaggedBatch { len: usize, dim: EmbeddingDim },
}

impl fmt::Display for ContrastiveError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::RepresentationCollapse { mean_similarity, uniformity } => write!(
                f,
                "mean pairwise cosine {mean_similarity:.3} exceeds \\
                 {COLLAPSE_SIMILARITY}, uniformity {uniformity:.3} -- the loss \\
                 value will look healthy regardless"
            ),
            Self::DegenerateTemperature { temperature } => write!(
                f,
                "temperature {temperature} at or below {MIN_TEMPERATURE}; the \\
                 gradient scales with 1/tau and the logits will overflow"
            ),
            Self::TooFewNegatives { found, required, sampler } => write!(
                f,
                "sampler {sampler} produced {found} negatives, below {required}; \\
                 batch size is a capacity parameter for this loss, not a \\
                 throughput knob"
            ),
            Self::MetricMismatch { index_metric } => write!(
                f,
                "index metric {index_metric} but embeddings are trained with \\
                 cosine; an inner-product index over normalized vectors is \\
                 equivalent, anything else degrades silently"
            ),
            Self::EncoderVersionMismatch { index, query } => write!(
                f,
                "index built by encoder {} queried with embedding from {}; \\
                 embeddings from different encoders are not comparable",
                index.0, query.0
            ),
            Self::RaggedBatch { len, dim } => write!(
                f,
                "embedding buffer of {len} is not a multiple of dimension {}",
                dim.0
            ),
        }
    }
}

impl std::error::Error for ContrastiveError {}

/// Where the negatives come from.
///
/// A trait because this is the component that decides what the model
/// learns. Two teams with the same encoder and different samplers have
/// materially different systems.
pub trait NegativeSampler {
    fn name(&self) -> String;

    /// Returns candidate positions for one anchor. Borrows into internal
    /// scratch rather than allocating per call.
    fn candidates(&mut self, anchor: BatchPos, n_anchors: usize) -> &[usize];
}

/// Every other item in the batch. Free, effective, and quietly risky: some
/// of these candidates are genuine positives sharing the batch, and a
/// small temperature concentrates the gradient on exactly those.
pub struct InBatchSampler {
    known_duplicates: Vec<(usize, usize)>,
    scratch: Vec<usize>,
}

impl InBatchSampler {
    #[must_use]
    pub fn new(known_duplicates: Vec<(usize, usize)>) -> Self {
        Self { known_duplicates, scratch: Vec::new() }
    }

    fn is_duplicate(&self, left: usize, right: usize) -> bool {
        self.known_duplicates
            .iter()
            .any(|(a, b)| (*a == left && *b == right) || (*a == right && *b == left))
    }
}

impl NegativeSampler for InBatchSampler {
    fn name(&self) -> String {
        "in-batch".to_string()
    }

    fn candidates(&mut self, anchor: BatchPos, n_anchors: usize) -> &[usize] {
        self.scratch.clear();
        self.scratch.reserve(n_anchors);
        // Iterator chain rather than an index loop: the filter reads as
        // the actual rule instead of as a pair of guarded branches.
        let kept: Vec<usize> = (0..n_anchors)
            .filter(|other| *other != anchor.0 && !self.is_duplicate(anchor.0, *other))
            .collect();
        self.scratch.extend(kept);
        &self.scratch
    }
}

/// Mined hard negatives, capped deliberately.
///
/// The cap is the point. Ever-harder negatives improve the gradient right
/// up until the hardest candidates are predominantly false negatives, and
/// then the model is being trained to separate true positives. Nothing in
/// the loss detects that, so the share is bounded and the mined pairs are
/// meant to be read by eye.
pub struct MinedHardSampler {
    hard_indices: Vec<Vec<usize>>,
    max_hard_fraction: f32,
    scratch: Vec<usize>,
}

impl MinedHardSampler {
    pub fn new(
        hard_indices: Vec<Vec<usize>>,
        max_hard_fraction: f32,
    ) -> Result<Self, String> {
        if !(0.0..=1.0).contains(&max_hard_fraction) {
            return Err(format!(
                "max_hard_fraction must lie in [0, 1], got {max_hard_fraction}"
            ));
        }
        Ok(Self { hard_indices, max_hard_fraction, scratch: Vec::new() })
    }
}

impl NegativeSampler for MinedHardSampler {
    fn name(&self) -> String {
        format!("mined-hard(cap={})", self.max_hard_fraction)
    }

    fn candidates(&mut self, anchor: BatchPos, n_anchors: usize) -> &[usize] {
        self.scratch.clear();
        let budget = ((n_anchors - 1) as f32 * self.max_hard_fraction) as usize;

        self.scratch.extend(
            self.hard_indices[anchor.0]
                .iter()
                .copied()
                .filter(|hard| *hard != anchor.0)
                .take(budget),
        );

        let filled: Vec<usize> = (0..n_anchors)
            .filter(|other| *other != anchor.0 && !self.scratch.contains(other))
            .take(n_anchors - 1 - self.scratch.len())
            .collect();
        self.scratch.extend(filled);
        &self.scratch
    }
}

/// Alignment and uniformity, which the loss value conflates.
#[derive(Debug, Clone, Copy)]
pub struct Geometry {
    pub alignment: f32,
    pub uniformity: f32,
    pub mean_similarity: f32,
    pub max_similarity: f32,
}

impl Geometry {
    #[must_use]
    pub fn has_collapsed(&self) -> bool {
        self.mean_similarity > COLLAPSE_SIMILARITY
    }

    /// Turn the diagnostic into an error, for a training loop that should
    /// stop rather than spend another day collapsing.
    pub fn err_if_collapsed(&self) -> Result<(), ContrastiveError> {
        if !self.has_collapsed() {
            return Ok(());
        }
        Err(ContrastiveError::RepresentationCollapse {
            mean_similarity: self.mean_similarity,
            uniformity: self.uniformity,
        })
    }
}

pub struct Outcome {
    pub loss: f32,
    pub geometry: Geometry,
    pub sampler_name: String,
    pub negatives_per_anchor: usize,
}

/// One place normalization happens, shared by the objective AND the index,
/// so the two cannot disagree about the metric.
pub fn l2_normalize_rows(embeddings: &mut [f32], dim: EmbeddingDim) {
    for row in embeddings.chunks_exact_mut(dim.0) {
        let norm = row.iter().map(|value| value * value).sum::<f32>().sqrt();
        if norm < 1e-12 {
            continue;
        }
        for value in row.iter_mut() {
            *value /= norm;
        }
    }
}

pub struct ContrastiveObjective<S: NegativeSampler> {
    sampler: S,
    dim: EmbeddingDim,
    temperature: f32,
    min_negatives: usize,
}

impl<S: NegativeSampler> ContrastiveObjective<S> {
    /// Everything checkable is checked here, before any forward pass.
    pub fn new(
        sampler: S,
        dim: EmbeddingDim,
        temperature: f32,
        min_negatives: usize,
    ) -> Result<Self, ContrastiveError> {
        if temperature <= MIN_TEMPERATURE {
            return Err(ContrastiveError::DegenerateTemperature { temperature });
        }
        Ok(Self { sampler, dim, temperature, min_negatives })
    }

    /// Borrows both blocks; the caller keeps ownership of its embeddings.
    pub fn evaluate(
        &mut self,
        anchors: &mut [f32],
        positives: &mut [f32],
    ) -> Result<Outcome, ContrastiveError> {
        let width = self.dim.0;
        if anchors.len() % width != 0 || anchors.len() != positives.len() {
            return Err(ContrastiveError::RaggedBatch {
                len: anchors.len(),
                dim: self.dim,
            });
        }

        l2_normalize_rows(anchors, self.dim);
        l2_normalize_rows(positives, self.dim);

        let n_anchors = anchors.len() / width;
        let mut total = 0.0;
        let mut negative_count = 0;

        for anchor in 0..n_anchors {
            let candidates = self.sampler.candidates(BatchPos(anchor), n_anchors);
            if candidates.len() < self.min_negatives {
                return Err(ContrastiveError::TooFewNegatives {
                    found: candidates.len(),
                    required: self.min_negatives,
                    sampler: self.sampler.name(),
                });
            }
            negative_count = candidates.len();

            let query = &anchors[anchor * width..(anchor + 1) * width];
            let positive = &positives[anchor * width..(anchor + 1) * width];
            let positive_logit = inner(query, positive) / self.temperature;

            let negative_logits: Vec<f32> = candidates
                .iter()
                .map(|other| {
                    inner(query, &anchors[other * width..(other + 1) * width])
                        / self.temperature
                })
                .collect();

            let top = negative_logits
                .iter()
                .copied()
                .fold(positive_logit, f32::max);
            let sum_exp: f32 = std::iter::once(positive_logit)
                .chain(negative_logits.iter().copied())
                .map(|value| (value - top).exp())
                .sum();

            total += top + sum_exp.ln() - positive_logit;
        }

        Ok(Outcome {
            loss: total / n_anchors as f32,
            geometry: measure_geometry(anchors, positives, self.dim),
            sampler_name: self.sampler.name(),
            negatives_per_anchor: negative_count,
        })
    }
}

fn inner(left: &[f32], right: &[f32]) -> f32 {
    left.iter().zip(right.iter()).map(|(a, b)| a * b).sum()
}

/// Alignment, uniformity, and the two similarity statistics.
///
/// Cheap enough to compute every step, and the only signal that separates
/// a collapsed embedding from a converged one.
#[must_use]
pub fn measure_geometry(
    anchors: &[f32],
    positives: &[f32],
    dim: EmbeddingDim,
) -> Geometry {
    let width = dim.0;
    let n_anchors = anchors.len() / width;

    let alignment: f32 = anchors
        .chunks_exact(width)
        .zip(positives.chunks_exact(width))
        .map(|(anchor, positive)| {
            anchor
                .iter()
                .zip(positive.iter())
                .map(|(a, p)| (a - p) * (a - p))
                .sum::<f32>()
        })
        .sum::<f32>()
        / n_anchors as f32;

    let mut pair_total = 0.0;
    let mut similarity_total = 0.0;
    let mut max_similarity = -1.0f32;
    let mut pair_count = 0usize;

    for left in 0..n_anchors {
        for right in (left + 1)..n_anchors {
            let similarity = inner(
                &anchors[left * width..(left + 1) * width],
                &anchors[right * width..(right + 1) * width],
            );
            let squared = (2.0 - 2.0 * similarity).max(0.0);
            pair_total += (-2.0 * squared).exp();
            similarity_total += similarity;
            max_similarity = max_similarity.max(similarity);
            pair_count += 1;
        }
    }

    let pairs = pair_count.max(1) as f32;
    Geometry {
        alignment,
        uniformity: (pair_total / pairs).ln(),
        mean_similarity: similarity_total / pairs,
        max_similarity,
    }
}

/// Owns the corpus embeddings and the encoder version that produced them.
pub struct EmbeddingIndex {
    corpus: Vec<f32>,
    dim: EmbeddingDim,
    version: EncoderVersion,
}

impl EmbeddingIndex {
    pub fn new(
        mut corpus: Vec<f32>,
        dim: EmbeddingDim,
        metric: &str,
        version: EncoderVersion,
    ) -> Result<Self, ContrastiveError> {
        if metric != "cosine" {
            return Err(ContrastiveError::MetricMismatch {
                index_metric: metric.to_string(),
            });
        }
        if dim.0 == 0 || corpus.len() % dim.0 != 0 {
            return Err(ContrastiveError::RaggedBatch { len: corpus.len(), dim });
        }
        l2_normalize_rows(&mut corpus, dim);
        Ok(Self { corpus, dim, version })
    }

    /// Refuses a query from a different encoder generation. Exact search,
    /// which overstates production recall -- anything serving at scale
    /// uses an approximate index, and the gap is not negligible.
    pub fn retrieve(
        &self,
        query: &[f32],
        query_version: &EncoderVersion,
        top_k: usize,
    ) -> Result<Vec<CorpusId>, ContrastiveError> {
        if *query_version != self.version {
            return Err(ContrastiveError::EncoderVersionMismatch {
                index: self.version.clone(),
                query: query_version.clone(),
            });
        }

        let mut scored: Vec<(f32, usize)> = self
            .corpus
            .chunks_exact(self.dim.0)
            .enumerate()
            .map(|(idx, row)| (inner(query, row), idx))
            .collect();

        scored.sort_by(|left, right| {
            right.0.partial_cmp(&left.0).unwrap_or(std::cmp::Ordering::Equal)
        });
        scored.truncate(top_k);
        Ok(scored.into_iter().map(|(_, idx)| CorpusId(idx)).collect())
    }
}
`,
        profile:
          'Same asymptotics as the naive version, with the candidate vector reused across anchors through sampler scratch rather than reallocated per call. Illustrative, not a measured benchmark: the substantive change is that collapse, a degenerate temperature, a starved candidate set and an encoder-version mismatch are all typed failures a caller must handle rather than silent quality regressions.',
      },
      'make-it-fast': {
        rationale:
          'The per-anchor loop collapses into one similarity matrix: with in-batch negatives every anchor shares the same candidate set, so the whole loss is a single ndarray GEMM pair followed by a row-wise cross-entropy where the correct column for row i is column i. That matrix is computed once and reused by the loss, the geometry diagnostics and hard-negative mining rather than three times, which is the fusion that matters because it is the dominant cost. False negatives are excluded by an additive mask rather than by rebuilding candidate lists, rayon parallelizes the row reductions since rows are independent once the matrix exists, and the scratch buffers are sized from the batch shape up front so a training loop performs no per-step allocation.',
        optimizations: [
          {
            technique: 'ndarray with the BLAS feature enabled',
            why: 'The entire similarity structure becomes one GEMM pair over the batch instead of a dot product per anchor-candidate pair',
            tradeoff: 'Peak memory grows as the square of the batch size, which becomes the binding constraint precisely at the batch sizes this loss wants',
          },
          {
            technique: 'rayon for data parallelism',
            why: 'Row reductions are independent once the matrix exists, so the masked softmax and loss accumulate across cores',
            tradeoff: 'Only worthwhile above a few hundred rows, and BLAS must be pinned to one thread or the two pools contend',
          },
          {
            technique: 'Operate on slices to keep data contiguous',
            why: 'Embeddings and the similarity matrix are row-major, so each row reduction streams sequentially rather than striding',
            tradeoff: 'Anything needing column-wise access must work from an explicit transpose, which costs a copy of the whole matrix',
          },
          {
            technique: 'Vec::with_capacity to avoid reallocation',
            why: 'Mining and mask buffers are sized from the batch shape up front, so a training loop performs no per-step allocation',
            tradeoff: 'Buffers are held at the largest batch shape seen, so memory does not shrink when a smaller batch follows a larger one',
          },
        ],
        code: `//! Contrastive embeddings as one Gram matrix and one masked softmax.
//!
//! With in-batch negatives, every anchor's candidate set is the same
//! batch. So the natural form of the loss is not a loop over anchors at
//! all -- it is a single B x 2B similarity matrix, masked, then one
//! row-wise cross-entropy where the correct class for row i is column i.
//!
//! That matrix is also the memory cost of the technique. It grows as B^2,
//! and since batch size here is a CAPACITY parameter rather than a
//! throughput knob -- a larger batch is a harder and better-estimated
//! problem, not merely a faster one -- the B^2 term is what actually
//! bounds how good the model can get on given hardware. That is why
//! memory banks and momentum encoders exist: they add negatives without
//! adding to this matrix.
//!
//! Requires OPENBLAS_NUM_THREADS=1, or BLAS and rayon oversubscribe.

use ndarray::{s, Array2, ArrayView2, ArrayViewMut2, Axis};
use rayon::prelude::*;

const COLLAPSE_SIMILARITY: f32 = 0.9;
/// Additive and f32-safe, unlike -inf which poisons the row max.
const MASK_VALUE: f32 = -1e4;

#[derive(Debug, Clone, Copy)]
pub struct BatchPos(pub usize);

/// Allocated once per batch shape and overwritten in place, so a training
/// loop performs no per-step allocation. Held at the largest shape seen.
pub struct Buffers {
    similarity: Array2<f32>,
    mask: Array2<f32>,
    mined: Vec<usize>,
    max_batch: usize,
}

impl Buffers {
    #[must_use]
    pub fn new(max_batch: usize, mine_k: usize) -> Self {
        Self {
            similarity: Array2::zeros((max_batch, 2 * max_batch)),
            mask: Array2::zeros((max_batch, 2 * max_batch)),
            mined: Vec::with_capacity(max_batch * mine_k),
            max_batch,
        }
    }
}

/// L2-normalize rows in place, on a contiguous row-major block.
///
/// Contiguity is not cosmetic: the GEMM below is the dominant BLAS call,
/// and a strided input forces a copy on every step.
pub fn normalize_rows(mut embeddings: ArrayViewMut2<f32>) {
    for mut row in embeddings.outer_iter_mut() {
        let norm = row.iter().map(|value| value * value).sum::<f32>().sqrt();
        if norm < 1e-12 {
            continue;
        }
        row /= norm;
    }
}

pub struct Geometry {
    pub alignment: f32,
    pub uniformity: f32,
    pub mean_similarity: f32,
    pub collapsed: bool,
}

/// One GEMM pair, one masked softmax, one cross-entropy.
///
/// Layout: column j is positive j for j < B, and anchor j-B for j >= B. So
/// row i has its true positive at column i, and every other column in both
/// blocks is a negative. That single layout yields 2B-1 negatives per
/// anchor from two B x B matmuls.
pub fn info_nce(
    anchors: ArrayView2<f32>,
    positives: ArrayView2<f32>,
    temperature: f32,
    false_negative_pairs: &[(usize, usize)],
    buffers: &mut Buffers,
) -> f32 {
    let n_anchors = anchors.nrows();
    if temperature <= 0.0 || n_anchors < 2 || n_anchors > buffers.max_batch {
        return 0.0;
    }
    let stride = 2 * n_anchors;
    let inv_tau = 1.0 / temperature;

    {
        let mut similarity = buffers.similarity.slice_mut(s![..n_anchors, ..stride]);
        let against_positives = anchors.dot(&positives.t());
        let against_anchors = anchors.dot(&anchors.t());
        similarity
            .slice_mut(s![.., ..n_anchors])
            .assign(&(&against_positives * inv_tau));
        similarity
            .slice_mut(s![.., n_anchors..])
            .assign(&(&against_anchors * inv_tau));
    }

    {
        let mut mask = buffers.mask.slice_mut(s![..n_anchors, ..stride]);
        mask.fill(0.0);
        // An anchor against itself in the right block is not a negative,
        // it is the same vector: similarity 1 regardless of training.
        for row in 0..n_anchors {
            mask[[row, n_anchors + row]] = MASK_VALUE;
        }
        // Known false negatives, masked additively rather than by
        // rebuilding candidate lists. These are what a small temperature
        // punishes hardest, so excluding the identifiable ones is the
        // highest-value correction available here.
        for &(left, right) in false_negative_pairs {
            if left >= n_anchors || right >= n_anchors {
                continue;
            }
            mask[[left, right]] = MASK_VALUE;
            mask[[right, left]] = MASK_VALUE;
            mask[[left, n_anchors + right]] = MASK_VALUE;
            mask[[right, n_anchors + left]] = MASK_VALUE;
        }
    }

    let mask_view = buffers.mask.slice(s![..n_anchors, ..stride]).to_owned();
    let mut similarity = buffers.similarity.slice_mut(s![..n_anchors, ..stride]);
    similarity += &mask_view;

    // Rows are independent once the matrix exists. Worth parallelizing
    // only above a few hundred rows; below that the join costs more than
    // the reduction.
    let total: f32 = similarity
        .outer_iter()
        .into_par_iter()
        .enumerate()
        .map(|(row, scores)| {
            let top = scores.iter().copied().fold(f32::NEG_INFINITY, f32::max);
            let sum_exp: f32 = scores.iter().map(|value| (value - top).exp()).sum();
            // The correct class for row i is column i. No gather needed.
            top + sum_exp.ln() - scores[row]
        })
        .sum();

    total / n_anchors as f32
}

/// Alignment and uniformity from the matrix already computed.
///
/// Reuses the masked matrix rather than recomputing cosines, which is the
/// point of keeping it: the diagnostics become nearly free and can run
/// every step. Collapse shows as mean similarity near 1 and uniformity
/// near 0 while the loss sits at ln(2B-1) and looks entirely healthy.
#[must_use]
pub fn geometry_from_similarity(
    buffers: &Buffers,
    n_anchors: usize,
    temperature: f32,
) -> Geometry {
    let stride = 2 * n_anchors;
    let similarity = buffers.similarity.slice(s![..n_anchors, ..stride]);

    let alignment: f32 = (0..n_anchors)
        .map(|row| {
            let cosine = similarity[[row, row]] * temperature;
            (2.0 - 2.0 * cosine).max(0.0)
        })
        .sum::<f32>()
        / n_anchors as f32;

    let mut pair_total = 0.0;
    let mut similarity_total = 0.0;
    let mut pair_count = 0usize;

    for left in 0..n_anchors {
        for right in (left + 1)..n_anchors {
            let cosine = similarity[[left, n_anchors + right]] * temperature;
            let squared = (2.0 - 2.0 * cosine).max(0.0);
            pair_total += (-2.0 * squared).exp();
            similarity_total += cosine;
            pair_count += 1;
        }
    }

    let pairs = pair_count.max(1) as f32;
    let mean_similarity = similarity_total / pairs;

    Geometry {
        alignment,
        uniformity: (pair_total / pairs).ln(),
        mean_similarity,
        collapsed: mean_similarity > COLLAPSE_SIMILARITY,
    }
}

/// The hardest in-batch negatives, from the same matrix again.
///
/// Worth being explicit about what these are. They are the candidates the
/// gradient already concentrates on at a small temperature, so mining
/// them is mostly a way to find them for AUDIT rather than a way to
/// increase their weight. Reading a sample of mined pairs by eye
/// routinely surfaces a systematic false-negative pattern no aggregate
/// metric reports.
pub fn mine_hard_negatives(
    buffers: &mut Buffers,
    n_anchors: usize,
    top_k: usize,
) -> &[usize] {
    let stride = 2 * n_anchors;
    let keep = top_k.min(n_anchors.saturating_sub(1));
    buffers.mined.clear();

    let similarity = buffers.similarity.slice(s![..n_anchors, ..stride]).to_owned();
    let mut ranked: Vec<usize> = Vec::with_capacity(n_anchors);

    for row in 0..n_anchors {
        ranked.clear();
        ranked.extend((0..n_anchors).filter(|other| *other != row));
        if ranked.len() > keep && keep > 0 {
            // select_nth_unstable rather than a full sort: only the top-k
            // boundary matters, and k is small against the batch size.
            ranked.select_nth_unstable_by(keep - 1, |left, right| {
                similarity[[row, n_anchors + *right]]
                    .partial_cmp(&similarity[[row, n_anchors + *left]])
                    .unwrap_or(std::cmp::Ordering::Equal)
            });
        }
        buffers.mined.extend(ranked.iter().take(keep));
    }

    &buffers.mined
}

pub struct MemoryCost {
    pub negatives_per_anchor: usize,
    pub embedding_mib: f32,
    pub similarity_mib: f32,
    pub similarity_share: f32,
}

/// What the B^2 term costs, and why memory banks exist.
///
/// Illustrative arithmetic, not a benchmark. The ratio is the point: the
/// similarity matrix overtakes the embedding block once the batch exceeds
/// the embedding dimension, and since a larger batch is a strictly harder
/// problem for this loss, that crossover is where the technique stops
/// scaling on-device and starts needing negatives held off the matrix.
#[must_use]
pub fn memory_cost(batch_size: usize, width: usize) -> MemoryCost {
    let embedding_bytes = (batch_size * width * 4) as f32;
    let similarity_bytes = (batch_size * 2 * batch_size * 4) as f32;
    let mib = 1024.0 * 1024.0;

    MemoryCost {
        negatives_per_anchor: 2 * batch_size - 1,
        embedding_mib: embedding_bytes / mib,
        similarity_mib: similarity_bytes / mib,
        similarity_share: similarity_bytes / (embedding_bytes + similarity_bytes),
    }
}

/// Mean-pool then normalize, for callers turning token states into one
/// embedding.
///
/// Worth stating because the pooling strategy is part of the model: a
/// checkpoint trained with one pooling and served with another degrades
/// with no error anywhere.
pub fn pool_and_normalize(hidden: ArrayView2<f32>, valid_len: usize) -> Array2<f32> {
    let pooled = hidden
        .slice(s![..valid_len, ..])
        .mean_axis(Axis(0))
        .expect("valid_len must be non-zero");
    let mut block = pooled.insert_axis(Axis(0)).to_owned();
    normalize_rows(block.view_mut());
    block
}
`,
        profile:
          'The loss becomes two B-by-B GEMMs plus a parallel row-wise softmax, so encoder cost dominates again and the similarity term is O(B²·d) arithmetic against O(B²) memory. Illustrative, not a measured benchmark: that quadratic memory is the real ceiling, since batch size here is a capacity parameter rather than a throughput knob, and it is why memory banks exist to add negatives without adding to this matrix.',
      },
    },
  },
};
