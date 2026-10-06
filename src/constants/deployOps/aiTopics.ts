/**
 * AI / LLM / MLOps first-principles topics.
 *
 * Provider-specific claims (seed semantics, sampling-parameter restrictions,
 * fingerprint fields) vary by vendor and change over time; they are hedged
 * here and should be re-verified against official docs before being quoted.
 */

import type { FirstPrinciplesTopic } from './types';

export const AI_TOPICS: FirstPrinciplesTopic[] = [
  {
    id: 'what-changes',
    navLabel: 'What changes',
    level: 'ai-llm-mlops',
    title: 'What changes when the system contains a model',
    summary:
      'Five differences from classical software reshape every stage of the delivery lifecycle.',
    what: 'Classical delivery assumes the same input and the same code give the same output. A system with a learned model or an LLM breaks that assumption in five specific ways, and each one changes how you version, test, release and watch the system.',
    why:
      'First, behavior is no longer code alone. It is code plus data plus trained weights plus prompts plus a retrieval index, and changing any one of them changes what the system does, so all five need versions. Second, correctness is statistical: a model is right 93% of the time, not "right", so a pass/fail unit test is replaced by an eval that measures a pass rate on a sample and compares it to a threshold. Third, failures are silent: a crashed service returns a 500, but a model that has drifted or a retriever that returns the wrong passage still returns 200 OK with a fluent, wrong answer, so health checks cannot see it and you must measure output quality directly. Fourth, cost is per request: every call spends GPU time or tokens, so load, prompt length and caching become budget lines, not just capacity concerns. Fifth, the loop closes through data: production traffic is the best source of new test cases and new training data, so the system improves (or decays) based on what it observes, and the observe stage feeds back into define and build.',
    how: [
      'Version all five inputs of behavior (code, data, weights, prompts, index) and record them together for every run and release.',
      'Replace single assertions with eval suites: sample, score, compare a pass rate to a threshold, and report uncertainty.',
      'Monitor output quality, not only availability: sample real traces, score them, and alert on drift in inputs and outputs.',
      'Track cost and latency per request as first-class metrics next to correctness.',
      'Route production traces back into the eval set and the training set so the next release starts from what actually happened.',
    ],
    stageIds: ['define', 'version', 'build', 'verify', 'release', 'deploy', 'operate', 'observe', 'learn'],
    tools: ['Data versioning', 'Experiment tracking', 'Eval harnesses', 'Tracing', 'Model registries'],
    breaksWhere:
      'Every stage can leak nondeterminism: unversioned data, unseeded training, batch-dependent kernels, silent provider changes and stochastic judges. The guarantee you can usually keep is statistical, not bitwise.',
    comparison: {
      caption: 'The nine lifecycle stages, read through an ML or LLM lens',
      rowHeader: 'Stage',
      columns: [
        'What changes for ML/LLM systems',
        'Representative technologies',
        'Where determinism breaks',
      ],
      rows: [
        {
          id: 'define',
          label: 'Define',
          cells: [
            'Requirements become measurable targets: a metric, a threshold, a cost and latency budget, and the failure cases that matter.',
            'Eval specs, golden datasets, error-analysis notes',
            'Targets are statistical; "correct" is a distribution over inputs, not a single expected output.',
          ],
        },
        {
          id: 'version',
          label: 'Version',
          cells: [
            'Code is not enough: data, weights, prompts, configs and the index need versions that move together.',
            'Git, DVC, lakeFS, MLflow Registry, prompt registries',
            'Mutable upstream data, floating model aliases and unlogged seeds make a version name point at different behavior.',
          ],
        },
        {
          id: 'build',
          label: 'Build',
          cells: [
            'Building means training or fine-tuning (or assembling prompts and an index), not just compiling.',
            'PyTorch, DDP/FSDP, Optuna, Ray Tune, embedding pipelines',
            'Float reductions are not associative, GPU kernels may be nondeterministic, and data order and seeds vary.',
          ],
        },
        {
          id: 'verify',
          label: 'Verify',
          cells: [
            'Tests become evals: scored samples against thresholds, with human-calibrated judges.',
            'Golden sets, LLM-as-judge, regression suites, trace analysis',
            'Outputs are sampled and the judge is itself a stochastic model, so results need repeats and confidence intervals.',
          ],
        },
        {
          id: 'release',
          label: 'Release',
          cells: [
            'Promotion is moving a pointer (alias, prompt version, index alias) after the evals pass, with shadow or canary traffic.',
            'MLflow aliases, shadow traffic, eval-gated rollout',
            'A pointer move does not recreate a model whose data or provider snapshot is gone.',
          ],
        },
        {
          id: 'deploy',
          label: 'Deploy',
          cells: [
            'Ship an immutable serving image with the right GPU stack, plus the model artifact and its config.',
            'Docker, NVIDIA Container Toolkit, vLLM, Triton, TF Serving',
            'Driver, CUDA and kernel versions change numerics; dynamic batching makes outputs depend on concurrent traffic.',
          ],
        },
        {
          id: 'operate',
          label: 'Operate',
          cells: [
            'Capacity is tokens and GPU memory; scaling and caching decide cost, and guardrails bound behavior.',
            'Autoscaling, KV-cache management, prompt caching, guardrails, model routing',
            'Latency and output vary with batch composition and load; providers may change backends silently.',
          ],
        },
        {
          id: 'observe',
          label: 'Observe',
          cells: [
            'A 200 OK can be a wrong answer, so watch quality, drift, cost and the full chain of a request.',
            'Tracing, PSI/KS drift tests, online evals, feedback signals',
            'Ground truth arrives late and "drifted" is a threshold judgment, not a fact.',
          ],
        },
        {
          id: 'learn',
          label: 'Learn',
          cells: [
            'Production traces become new eval cases and training data, which restarts the loop.',
            'Trace-to-dataset pipelines, labeling queues, scheduled retraining',
            'The eval set ages as inputs shift; a score from last quarter measures last quarter\'s traffic.',
          ],
        },
      ],
    },
    sourceBookIds: ['ai-engineering', 'designing-machine-learning-systems', 'llmops', 'reliable-machine-learning'],
  },
  {
    id: 'data-version-control',
    navLabel: 'Data versioning',
    level: 'ai-llm-mlops',
    title: 'Data version control',
    summary: 'A trained model is a function of code and data, so the data needs a lockfile too.',
    what: 'Pin the exact dataset a model was trained or evaluated on, with content hashes and snapshot ids, and keep lineage from inputs to output.',
    why:
      'Retraining on "the same code" a month later gives a different model if the table underneath changed. Git cannot hold gigabytes, so the usual answer is to store the data in object storage and commit a small pointer file containing a content hash. Because the hash is computed from the bytes, two people who hold the same hash hold the same data, and a changed byte produces a different hash. Lineage then follows: output hash is determined by input hashes, code commit and parameters, so any model can be traced back to what made it, and an unchanged stage can be skipped.',
    how: [
      'Store large files in object storage and commit pointer files with content hashes next to the code.',
      'Use snapshot or time-travel features of table formats so a query can ask for "the table as of version N".',
      'Record input hashes, code commit and parameters for every pipeline stage so outputs are traceable.',
      'Set a retention and deduplication policy up front, because every snapshot costs storage.',
    ],
    stageIds: ['version', 'build'],
    tools: ['DVC (pointer files + remote cache)', 'lakeFS (git-like branches over object storage)', 'Delta Lake / Iceberg time travel'],
    breaksWhere:
      'Mutable upstream sources, non-reproducible sampling or shuffles, and deletion requests (such as GDPR erasure) that conflict with immutable history all break the guarantee. Branching is cheap when it is metadata-only and expensive if objects are copied.',
    sourceBookIds: ['designing-machine-learning-systems', 'practical-mlops', 'reliable-machine-learning'],
  },
  {
    id: 'feature-stores-and-skew',
    navLabel: 'Feature stores',
    level: 'ai-llm-mlops',
    title: 'Feature stores and training/serving skew',
    summary: 'Define each feature once, and serve it identically to training and to production.',
    what: 'A feature store holds feature definitions and values so the offline (training) path and the online (serving) path compute the same thing.',
    why:
      'A model learns from numbers produced by a transformation. If training computes "average spend over 30 days" in a batch SQL job and serving recomputes it in application code, the two implementations will eventually disagree on rounding, time zones or null handling, and the model receives inputs it never saw. This is training/serving skew, and it is silent: nothing crashes, accuracy just drops. A second trap is time: if a training row for last March accidentally includes a value computed in April, the model learns from the future and looks great offline and bad live. Point-in-time-correct joins prevent this by fetching, for each row, only values known at that row\'s timestamp.',
    how: [
      'Write each transformation once and let the store materialize it to both an offline table and a low-latency online store.',
      'Join training data with point-in-time semantics so no row sees values from after its timestamp.',
      'Set a staleness (TTL) budget for online values and alert when it is exceeded.',
      'Log the features actually sent at serving time and compare their distributions with training features.',
    ],
    stageIds: ['build', 'operate', 'observe'],
    tools: ['Feast', 'Tecton'],
    breaksWhere:
      'Skew returns through duplicated transformation code, time-travel leakage and stale online values. A shared definition also costs flexibility: notebook-only features must be promoted before they can ship.',
    sourceBookIds: ['designing-machine-learning-systems', 'practical-mlops', 'reliable-machine-learning'],
  },
  {
    id: 'experiment-tracking',
    navLabel: 'Experiment tracking',
    level: 'ai-llm-mlops',
    title: 'Experiment tracking',
    summary: 'Every training run leaves a record complete enough to explain or redo it.',
    what: 'Log parameters, metrics, artifacts, code commit, data hash, environment and seeds for every run.',
    why:
      'Training is exploratory: you try dozens of variants, and the winner is only useful if you can say what it was. Without a record, "the good run from Tuesday" is folklore. A run is reproducible only if every input that affects the result is captured, so the tracker\'s job is to make the input list complete and attach it to the output. Logging too little leaves runs unreproducible; logging everything costs storage and discipline, so the practical rule is to log whatever would change the result.',
    how: [
      'Create a run per training attempt and log params, metrics over time, and output artifacts.',
      'Attach the code commit, the data version and the environment (container digest or lockfile) to the run.',
      'Record every random seed, including data shuffling and weight initialization.',
      'Package the entry point with its environment so a teammate can re-run it with one command.',
    ],
    stageIds: ['version', 'build', 'learn'],
    tools: ['MLflow Tracking', 'MLflow Projects (MLproject + conda or Docker env)'],
    breaksWhere:
      'A tracked run is only as reproducible as its unlogged inputs: untracked data, unpinned drivers, and unseeded nondeterminism.',
    sourceBookIds: ['practical-mlops', 'designing-machine-learning-systems', 'reliable-machine-learning'],
  },
  {
    id: 'model-registry',
    navLabel: 'Model registry',
    level: 'ai-llm-mlops',
    title: 'Model registry',
    summary: 'Immutable model versions, plus movable aliases that say which one is live.',
    what: 'A registry stores each trained model as an immutable numbered version with lineage, and uses aliases to mark roles such as champion and challenger.',
    why:
      'Software has the same idea: commits never change, branches and tags move. If you edited a model version in place, you could no longer say what was running last week. So the version is frozen and linked to the run that made it, and "production" becomes a pointer you move. That makes promotion and rollback one cheap, auditable operation. MLflow originally modelled this with fixed stages (Staging, Production, Archived); those stages were deprecated (since 2.9) in favor of aliases and tags, because a fixed list of stages is too rigid for real workflows. Load by alias, as in models:/name@alias, and the serving code never needs to change on promotion.',
    how: [
      'Register each candidate as a new immutable version linked to its run.',
      'Use aliases (champion, challenger) for roles and tags for review state; do not use stages.',
      'Promote by moving the alias after the eval gate passes, and log who moved it.',
      'Roll back by repointing the alias to the previous version.',
    ],
    stageIds: ['version', 'release'],
    tools: ['MLflow Registry aliases (models:/name@alias)', 'Tags for review state'],
    breaksWhere:
      'Aliases move without code review unless changes are gated or audited. Rollback also only works if the data and feature definitions behind the old version still exist; repointing cannot recreate a model whose inputs were lost.',
    sourceBookIds: ['practical-mlops', 'reliable-machine-learning', 'designing-machine-learning-systems'],
  },
  {
    id: 'distributed-training',
    navLabel: 'Distributed training',
    level: 'ai-llm-mlops',
    title: 'Distributed training and memory',
    summary: 'Split the work or split the model; each choice trades speed, memory and exactness.',
    what: 'Training that does not fit one GPU in time or memory is spread across devices using data, sharded-state, tensor or pipeline parallelism.',
    why:
      'Start with what must live in GPU memory: parameters, gradients, optimizer state (often two extra copies per parameter for Adam) and activations saved for the backward pass. Data parallelism (DDP) puts a full copy of the model on every GPU, gives each a slice of the batch, then averages gradients across GPUs with an all-reduce so all copies stay identical. It is the fastest option per GPU but caps at what one GPU can hold. FSDP (and DeepSpeed ZeRO) shards parameters, gradients and optimizer state across GPUs and gathers a layer\'s weights just in time, which fits much larger models at the price of extra communication. Tensor parallelism splits individual layers across GPUs in a node; pipeline parallelism assigns consecutive layers to different devices and pays idle "bubbles" while the pipeline fills and drains. Activation checkpointing frees activations and recomputes them in the backward pass, roughly a third more compute for a large memory cut. Gradient accumulation sums gradients over several small batches to mimic a large batch.',
    how: [
      'Use DDP first if the model, optimizer state and activations fit on one GPU.',
      'Move to FSDP or ZeRO when memory is the limit, optionally with CPU offload when you can pay in speed.',
      'Add tensor or pipeline parallelism for models too large for one node, accepting the bubble and the topology constraints.',
      'Turn on activation checkpointing and gradient accumulation to trade compute and time for memory and batch size.',
      'Define "reproducible" first: seeded-reproducible means the same seed gives statistically similar training; bitwise-reproducible means identical bytes, which is stricter and slower.',
    ],
    stageIds: ['build'],
    tools: ['PyTorch DDP', 'PyTorch FSDP / DeepSpeed ZeRO', 'Megatron-style tensor and pipeline parallelism', 'NCCL'],
    breaksWhere:
      'Seeded runs are comparable but not identical, because floating-point addition is not associative: summing the same gradients in a different order gives slightly different results. NCCL all-reduce order can vary with topology and timing, and some CUDA kernels are nondeterministic. Bitwise reproducibility needs deterministic-algorithm flags and a fixed topology, and costs speed.',
    comparison: {
      caption: 'Parallelism strategies and what each trades away',
      rowHeader: 'Strategy',
      columns: ['What is split', 'Gain', 'Cost'],
      rows: [
        {
          id: 'ddp',
          label: 'DDP',
          cells: [
            'The batch; the model is fully replicated',
            'Highest throughput per GPU; simple',
            'Every GPU holds the whole model, so it caps at one GPU\'s memory',
          ],
        },
        {
          id: 'fsdp',
          label: 'FSDP / ZeRO',
          cells: [
            'Parameters, gradients and optimizer state',
            'Fits much larger models',
            'Extra all-gather and reduce-scatter communication',
          ],
        },
        {
          id: 'pipeline',
          label: 'Pipeline parallel',
          cells: [
            'Consecutive groups of layers across devices',
            'Scales across nodes',
            'Idle bubbles waste utilization',
          ],
        },
        {
          id: 'checkpointing',
          label: 'Activation checkpointing',
          cells: [
            'Nothing; activations are recomputed instead of stored',
            'Large activation-memory reduction',
            'Roughly one third more compute',
          ],
        },
      ],
    },
    sourceBookIds: ['ai-engineering', 'designing-machine-learning-systems', 'hands-on-llm-serving'],
  },
  {
    id: 'hyperparameter-optimization',
    navLabel: 'Hyperparameters',
    level: 'ai-llm-mlops',
    title: 'Hyperparameter optimization',
    summary: 'Spend a limited compute budget on the settings most likely to pay off.',
    what: 'Search the space of settings that are not learned (learning rate, depth, regularization) for the combination that gives the best validation result.',
    why:
      'Each trial is a full training run, so budget is the constraint. Grid search tries every combination and grows exponentially with the number of settings. Random search samples the space instead, and works better for the same budget because usually only a few settings matter a lot, and random sampling tries many distinct values of each, while a grid repeats the same few. Bayesian methods (Gaussian-process or TPE surrogates with an acquisition function such as Expected Improvement) model past results and pick the next trial where improvement looks likely; they use samples well but are sequential, so they parallelize less well. Schedulers add early stopping: ASHA and Hyperband start many trials with a small budget and keep only the best performers at each rung, so weak trials end cheaply. Population-Based Training goes further and copies good trials into weak ones while mutating hyperparameters mid-run.',
    how: [
      'Define the search space with sensible scales (log scale for learning rate) and fix the metric and the budget.',
      'Start with random search or TPE; add ASHA or Hyperband to cut weak trials early.',
      'Use PBT when the best schedule changes during training, and accept that it yields a schedule, not a single config.',
      'Log the search space, seeds, every trial and the final schedule in the experiment tracker.',
    ],
    stageIds: ['build', 'verify'],
    tools: ['Optuna (TPE)', 'Ray Tune with ASHA / Hyperband', 'Population-Based Training'],
    breaksWhere:
      'PBT mutates hyperparameters mid-run, so the final model cannot be reproduced from a single config; only the logged schedule can. Early stopping can also kill slow starters that would have won.',
    sourceBookIds: ['designing-machine-learning-systems', 'practical-mlops', 'ai-engineering'],
  },
  {
    id: 'continuous-training-and-drift',
    navLabel: 'Drift and retraining',
    level: 'ai-llm-mlops',
    title: 'Continuous training and drift',
    summary: 'The world changes after you ship, so measure the change and retrain through a gate.',
    what: 'Retrain on a schedule, on measured drift, or on a performance drop, and validate each candidate before it replaces the live model.',
    why:
      'A model is a snapshot of the data it saw. When production inputs move away from that snapshot, predictions degrade without any code change. Covariate (data) drift means the input distribution P(x) changes, and you can detect it right away by comparing live inputs to training inputs with PSI (population stability index), the Kolmogorov-Smirnov test or Jensen-Shannon divergence. Concept drift means the relationship P(y|x) changes, so the same input now deserves a different answer; it is usually visible only through labels, which often arrive days or weeks late. Because thresholds are statistical, "drifted" is a judgment you tune, not a fact. Retraining too eagerly chases noise; too rarely ships a stale model.',
    how: [
      'Log serving inputs and predictions, and compare their distributions with a training reference window.',
      'Pick a drift metric per feature type and tune thresholds against past incidents to limit false alarms.',
      'Trigger retraining by schedule, drift alert or delayed-label performance drop.',
      'Gate the candidate with champion/challenger evaluation before moving the alias.',
    ],
    stageIds: ['observe', 'learn', 'release'],
    tools: ['PSI / KS tests', 'Prediction-drift dashboards', 'Champion/challenger evaluation'],
    breaksWhere:
      'Ground truth arrives late and thresholds are statistical, so detection lags and is a tuned judgment, not an assertion. Retraining also changes the model itself, so each cycle must pass the same gates as a new model.',
    sourceBookIds: ['designing-machine-learning-systems', 'reliable-machine-learning', 'practical-mlops'],
  },
  {
    id: 'model-serialization',
    navLabel: 'Serialization',
    level: 'ai-llm-mlops',
    title: 'Model serialization',
    summary: 'A model file is either data or a program; treat unknown ones as programs.',
    what: 'Save a trained model in a portable format so it can run outside its training environment.',
    why:
      'Python\'s pickle (used by torch.load on .pt and .pkl files) can store arbitrary objects, and loading them runs the code that rebuilds those objects. That means loading an untrusted model file is the same as running an untrusted program. Formats that store only numbers avoid this: safetensors holds raw tensors plus a small header, with no code path, and can be memory-mapped for fast loading. The trade-off is that safetensors stores weights only, not the architecture, so you still need the model definition. Portable graph formats such as ONNX decouple a model from its training framework, but operator support differs between runtimes, so the numeric output is not guaranteed to match the original.',
    how: [
      'Prefer safetensors for weights, and ship the architecture definition separately.',
      'If you must use torch.load, pass weights_only=True and only on files you trust.',
      'Verify hashes or signatures of downloaded artifacts and allow-list third-party hub models.',
      'When exporting to ONNX or another portable format, compare outputs with the original on a fixed test set and set a tolerance.',
    ],
    stageIds: ['build', 'release', 'deploy'],
    tools: ['safetensors', 'ONNX', 'SavedModel', 'TorchScript (maintenance mode; torch.export is the successor)'],
    breaksWhere:
      'torch.load on an untrusted .pt or .pkl file can execute arbitrary code. Even safe formats do not guarantee numerically identical output across runtimes.',
    comparison: {
      caption: 'Common model formats compared',
      rowHeader: 'Format',
      columns: ['What it stores', 'Code-execution risk', 'Main limitation'],
      rows: [
        {
          id: 'pickle',
          label: 'pickle (.pt / .pkl)',
          cells: ['Arbitrary Python objects', 'Yes: loading can run code', 'Unsafe for untrusted files'],
        },
        {
          id: 'safetensors',
          label: 'safetensors',
          cells: ['Tensors and a small header', 'No', 'Weights only; architecture is separate'],
        },
        {
          id: 'onnx',
          label: 'ONNX',
          cells: ['A portable compute graph and weights', 'No by design', 'Operator support and numerics differ between runtimes'],
        },
        {
          id: 'savedmodel',
          label: 'SavedModel',
          cells: ['TensorFlow graph, weights and signatures', 'Graph ops can include custom ops', 'Tied to the TensorFlow ecosystem'],
        },
      ],
    },
    sourceBookIds: ['practical-mlops', 'hands-on-llm-serving', 'reliable-machine-learning'],
  },
  {
    id: 'serving-and-gpu-containers',
    navLabel: 'Serving and GPUs',
    level: 'ai-llm-mlops',
    title: 'Serving and GPU containers',
    summary: 'Serve a model behind a stable contract, in an image whose GPU stack is pinned.',
    what: 'Package the model and its runtime as an immutable image and choose between batch and online inference by latency need.',
    why:
      'Batch inference runs offline over a large input set: it is throughput-oriented, cheap per item, and can be made idempotent by keying outputs on an input hash, but results are stale between runs. Online inference answers one request within a latency budget, so you pay for always-on GPUs. A GPU image depends on a stack that must line up: host driver, CUDA and cuDNN. Pin the base image by digest, not by tag, and match it to the driver; detect GPU architecture at runtime rather than hardcoding it. For LLMs, a request has two phases. Prefill processes the whole prompt in parallel and is compute-bound. Decode generates one token at a time, each needing the keys and values of all earlier tokens; those are stored in a KV cache so they are not recomputed, which makes decode memory-bandwidth-bound and makes the cache the main memory consumer. Continuous batching lets a finished sequence leave the batch and a new one join at the next step, keeping the GPU busy instead of waiting for the slowest request.',
    how: [
      'Pick batch or online per workload: batch for throughput and cost, online for latency with a stated SLO.',
      'Build a multi-stage, digest-pinned image with the NVIDIA Container Toolkit, and keep layers cached.',
      'For LLMs, use a server that manages the KV cache (paged allocation) and continuous batching.',
      'Measure time to first token (prefill) and inter-token latency (decode) separately, under realistic concurrency.',
      'Expose a stable API contract and version it independently of the model behind it.',
    ],
    stageIds: ['deploy', 'operate'],
    tools: ['vLLM', 'Triton Inference Server', 'TensorFlow Serving', 'FastAPI', 'Docker + NVIDIA Container Toolkit', 'Apache Airflow (batch)'],
    breaksWhere:
      'Batch size changes numerics (different kernels and reduction orders), so with dynamic or continuous batching a request\'s output can depend on what else was in flight. Driver and kernel updates also shift results slightly.',
    comparison: {
      caption: 'Batch versus online inference',
      rowHeader: 'Mode',
      columns: ['Optimized for', 'Cost profile', 'Limitation'],
      rows: [
        {
          id: 'batch',
          label: 'Batch',
          cells: ['Throughput; idempotent by input hash', 'Best throughput per dollar', 'Results are stale between runs'],
        },
        {
          id: 'online',
          label: 'Online',
          cells: ['Latency SLO per request', 'Always-on GPUs', 'Needs headroom for traffic spikes'],
        },
      ],
    },
    sourceBookIds: ['hands-on-llm-serving', 'llms-in-production', 'ai-engineering', 'practical-mlops'],
  },
  {
    id: 'prompt-versioning',
    navLabel: 'Prompts',
    level: 'ai-llm-mlops',
    title: 'Prompt versioning',
    summary: 'A prompt is source code for a model, so version it and tie it to its evals.',
    what: 'Store prompts with a content hash, named template variables and a link to the eval results that approved that exact text.',
    why:
      'Changing one sentence in a prompt can change the behavior of the whole system, but a text change looks harmless in a deploy. If prompts live inside code strings or a dashboard with no history, you cannot say which wording produced last week\'s results. A content hash makes "which prompt" exact; named variables make the template testable; the link to eval results makes approval auditable. The model is part of the contract too: the same prompt behaves differently on different model snapshots, so a prompt version is only meaningful together with the model it was tested on.',
    how: [
      'Keep prompts in version control or a registry with history and review.',
      'Use named template variables and validate that all are filled before sending.',
      'Store the eval run id and model snapshot next to each prompt version.',
      'Re-run the eval suite whenever the prompt or the model changes.',
    ],
    stageIds: ['version', 'verify', 'release'],
    tools: ['Git', 'Prompt registries', 'Eval-run metadata'],
    breaksWhere:
      'The prompt hash alone is not enough: the same text can behave differently across model snapshots, so pin the prompt and the model together.',
    sourceBookIds: ['llmops', 'ai-engineering', 'evals-for-ai-engineers'],
  },
  {
    id: 'rag-and-index-versioning',
    navLabel: 'RAG and indexes',
    level: 'ai-llm-mlops',
    title: 'RAG and vector index versioning',
    summary: 'The retrieval index is part of the model; version it and swap it like a database migration.',
    what: 'Retrieval-augmented generation fetches passages by vector similarity and pastes them into the prompt. The index, the embedding model and the chunking rules together decide what the model sees.',
    why:
      'An embedding model maps text to a point in a vector space, and "similar" means "close" in that specific space. Two different embedding models produce two unrelated spaces, so a query vector from model B compared to document vectors from model A gives meaningless distances. That is why changing the embedding model forces a full reindex: you must re-embed every document, not just new ones. Chunk size and overlap change which text each vector represents, so they are part of the version too. Because a reindex is slow and costly, build the new index next to the old one, test it, then switch an alias (a blue-green deploy), which also gives instant rollback at the price of double storage and embedding cost during the migration.',
    how: [
      'Record embedding model and version, chunking configuration and index version together.',
      'Build the new index in parallel and evaluate retrieval quality (hit rate on a labeled query set) before cutover.',
      'Swap an alias to the new index; keep the old one until the new one proves stable.',
      'Evaluate retrieval and generation separately so you know which one failed.',
    ],
    stageIds: ['version', 'build', 'release'],
    tools: ['Vector databases with alias swap', 'Embedding-model pinning', 'Retrieval eval sets'],
    breaksWhere:
      'Approximate nearest-neighbor search is approximate and can differ between index builds, so retrieval results are not bit-stable. Source documents also change, so the index goes stale unless refreshed.',
    sourceBookIds: ['ai-engineering', 'llmops', 'llms-in-production'],
  },
  {
    id: 'evals-as-tests',
    navLabel: 'Evals',
    level: 'ai-llm-mlops',
    title: 'Evals as tests',
    summary: 'When outputs are probabilistic, the test is a measured pass rate, and the judge needs testing too.',
    what: 'An eval runs the system on a set of cases, scores each output, and compares the aggregate to a threshold that gates a merge or a promotion.',
    why:
      'A unit test asserts that output equals a fixed value. That fails for generated text, where many different outputs are acceptable and the same input can give different ones. So replace equality with a score, and replace one run with a sample: run N cases, compute a pass rate, and gate on it with an interval so you do not mistake noise for regression. Where do the cases and metrics come from? Start with manual error analysis of real traces, name the failures you actually see, turn them into metrics, then automate. Scoring open-ended text is often done by an LLM-as-judge, but a judge is itself a model: it has biases (preferring the first answer, longer answers, or its own style) and it is stochastic. So calibrate it against human labels on a sample, track the agreement rate, and recalibrate when the judge model or the rubric changes. Human labels remain ground truth; they just do not scale.',
    how: [
      'Collect real traces, label failures by hand, and group them into categories.',
      'Build a golden set with those cases and a metric per failure category.',
      'Use deterministic checks where possible (schema, exact fields) and an LLM judge for the rest.',
      'Calibrate the judge against human labels and report agreement.',
      'Gate merges and promotions on pass rates with confidence intervals, and run each case several times when outputs vary.',
    ],
    stageIds: ['define', 'verify', 'release'],
    tools: ['Golden datasets', 'LLM-as-judge', 'Trace analysis', 'CI eval runners'],
    breaksWhere:
      'Outputs are probabilistic and the judge is nondeterministic too, so assert on pass rates with confidence intervals, not equality. A fixed eval set also goes stale as real inputs shift.',
    sourceBookIds: ['evals-for-ai-engineers', 'ai-engineering', 'llmops'],
  },
  {
    id: 'guardrails',
    navLabel: 'Guardrails',
    level: 'ai-llm-mlops',
    title: 'Guardrails',
    summary: 'Constrain what goes in and out of a model with checks you can test.',
    what: 'Validate inputs and outputs, filter sensitive data, constrain structured output to a schema, and keep refusal tests in the suite.',
    why:
      'A language model produces text by sampling the next token, so nothing inherently forces its output to be valid JSON, to avoid personal data, or to refuse a harmful request. In ordinary software you would put a schema and input validation at the boundary; guardrails are the same idea. Constrained decoding goes further by masking, at every step, the tokens that would violate the grammar, so the output must match the schema. Without it, the model can still break the schema or a tool-call contract, so you validate the result and retry rather than trust it. Every guardrail adds latency and false positives, so measure both.',
    how: [
      'Validate every model output against a schema before using it, and retry or fall back on failure.',
      'Use schema-constrained decoding where the serving stack supports it.',
      'Filter or redact sensitive data on the way in and out.',
      'Keep a refusal and safety test set in the eval suite and run it on every change.',
    ],
    stageIds: ['build', 'verify', 'operate'],
    tools: ['Schema-constrained decoding', 'PII filters', 'Refusal test sets', 'Output validators'],
    breaksWhere:
      'Without constrained decoding the model can still violate the schema; with it, the content inside a valid structure can still be wrong. Filters are statistical and miss cases.',
    sourceBookIds: ['llms-in-production', 'ai-engineering', 'evals-for-ai-engineers'],
  },
  {
    id: 'cost-latency-and-caching',
    navLabel: 'Cost and latency',
    level: 'ai-llm-mlops',
    title: 'Cost, latency and caching',
    summary: 'Every request spends tokens, so budget them and reuse work where it is safe.',
    what: 'Track tokens, time to first token, inter-token latency and tail latency, and cut cost with caching and routing.',
    why:
      'Cost scales with tokens processed, and the prompt is paid for on every call. Latency has two parts: time to first token (dominated by prefill, which grows with prompt length) and time between tokens (decode). Averages hide the pain, so track p95 and p99. Caching reuses work. Exact-match caching returns a stored answer for an identical request. Provider or server prompt caching reuses the computed state for a repeated prefix, so put stable content (instructions, examples) first and variable content last. Semantic caching returns a stored answer for a similar request, which raises the hit rate but risks returning the answer to a different question. Routing sends easy requests to a smaller, cheaper model, which then needs its own evals.',
    how: [
      'Set token budgets per request and per tenant, and cap usage.',
      'Order prompts with a stable prefix to benefit from prefix caching.',
      'Use exact-match caching first; add semantic caching only with a measured false-hit rate.',
      'Route by difficulty to smaller models, and evaluate each route separately.',
      'Load-test at realistic concurrency, because latency changes under batching.',
    ],
    stageIds: ['define', 'operate', 'observe'],
    tools: ['Token budgets', 'Prompt caching', 'Semantic caches', 'Model routing'],
    breaksWhere:
      'Usage is unbounded without caps, and latency depends on batch composition under load, so SLOs measured on an idle system do not hold in production.',
    sourceBookIds: ['llms-in-production', 'hands-on-llm-serving', 'ai-engineering'],
  },
  {
    id: 'model-and-provider-pinning',
    navLabel: 'Model pinning',
    level: 'ai-llm-mlops',
    title: 'Model and provider pinning',
    summary: 'Pin the exact model snapshot, and treat a version change as a release.',
    what: 'Reference dated model snapshot ids instead of floating aliases, and run evals before changing them.',
    why:
      'A floating alias such as "latest" is a pointer the provider moves, so your system\'s behavior can change with no change on your side, exactly like an unpinned dependency. A dated snapshot id fixes the target. Providers still retire old models, so pinning delays the work rather than removing it: when a snapshot is deprecated you must migrate, which means re-running the eval suite on the new model, comparing with shadow traffic, and only then cutting over.',
    how: [
      'Configure the exact snapshot id in one place and record it with each prompt version and eval run.',
      'Track deprecation dates and schedule migrations before cutoff.',
      'Run the full eval suite on the candidate model, then shadow live traffic and compare outputs.',
      'Roll out behind a flag with an eval-based gate.',
    ],
    stageIds: ['version', 'release', 'operate'],
    tools: ['Dated model snapshots', 'Shadow traffic', 'Eval-gated rollout'],
    breaksWhere:
      'Silent backend changes can alter outputs even for a pinned id; some providers expose a fingerprint-style field that helps detect this, but support varies and should be verified in the provider docs.',
    sourceBookIds: ['llmops', 'ai-engineering', 'llms-in-production'],
  },
  {
    id: 'nondeterminism-controls',
    navLabel: 'Nondeterminism',
    level: 'ai-llm-mlops',
    title: 'Nondeterminism controls and their limits',
    summary: 'Temperature 0 and seeds reduce variance but do not make an LLM bitwise repeatable.',
    what: 'Set sampling parameters to lower variance, then accept that the remaining guarantee is statistical.',
    why:
      'Sampling is one source of randomness: at temperature above 0 the next token is drawn from a probability distribution. Temperature 0 means always pick the most likely token (greedy), which removes that source. But the probabilities themselves are computed with floating-point arithmetic, and floating-point addition is not associative, so summing the same numbers in a different order gives slightly different results. Which order is used depends on the kernel, and inference kernels are often chosen by batch size, so the same prompt processed alongside different concurrent requests can produce tiny numeric differences. When two tokens are nearly tied, a tiny difference flips the choice, and then the rest of the text diverges. Seed parameters, where offered, are generally best effort rather than a guarantee, and some newer models restrict which sampling parameters you can set (check each provider\'s docs).',
    how: [
      'Use temperature 0 (or the lowest allowed), a fixed seed where supported, and constrained top_p for tests.',
      'Run important cases N times and gate on pass rate, not on a single run.',
      'Compare outputs semantically or by schema and key fields, not by exact string equality.',
      'Record the sampling parameters and model snapshot with each run.',
    ],
    stageIds: ['verify', 'operate'],
    tools: ['temperature=0', 'seed (best effort)', 'N-run pass-rate thresholds'],
    breaksWhere:
      'Greedy decoding is still not bitwise deterministic because of batch-dependent kernels and floating-point non-associativity. Lower temperature also reduces variety, which can hurt creative tasks. The practical standard is statistical.',
    sourceBookIds: ['ai-engineering', 'evals-for-ai-engineers', 'hands-on-llm-serving'],
  },
  {
    id: 'agent-harness',
    navLabel: 'Agent harness',
    level: 'ai-llm-mlops',
    title: 'The agent harness',
    summary: 'The runtime around an LLM agent decides what it can see, do and be held to.',
    what: 'An agent harness is the software that wraps a model in a loop: it holds state, exposes tools, enforces permissions, hands work between agents and emits telemetry. (This is not an eval harness, which is test scaffolding that scores outputs.)',
    why:
      'A model only maps text to text. To act, something must call it repeatedly, parse its requested actions, run them, and feed results back. That loop and everything around it is the harness, and most reliability comes from it rather than from the model. State: the context window is the model\'s only memory, so the harness decides what to keep, summarize or fetch, and where durable state lives so a crashed run can resume. Tools: each tool is an interface the model can misuse, so define narrow, typed inputs and validate them. Identity and capability boundaries: the agent should act with the least authority the task needs, with credentials scoped per task, because anything it can do, a mistaken or manipulated agent can do (prompt injection through retrieved text is the classic route). Handoff: when work passes between agents or to a human, the contract must say what context transfers and who owns the next step. Telemetry: log each step, tool call and decision as a trace so a failure can be replayed and analyzed.',
    how: [
      'Persist state outside the context window and make each step resumable.',
      'Give tools typed schemas, validate arguments, and require approval for irreversible actions.',
      'Scope credentials and permissions per task and treat retrieved or user text as untrusted.',
      'Define explicit handoff payloads between agents and to humans.',
      'Emit structured traces for every step, and cap steps, time and spend so loops terminate.',
    ],
    stageIds: ['build', 'operate', 'observe'],
    tools: ['Tool schemas', 'Sandboxed execution', 'Scoped credentials', 'Tracing', 'Step and budget limits'],
    breaksWhere:
      'The loop compounds small error rates over many steps and the model\'s choices vary run to run, so end-to-end behavior is statistical. Prompt injection can bypass intent unless capability limits are enforced outside the model.',
    sourceBookIds: ['harness-engineering', 'ai-engineering', 'observability-engineering', 'llms-in-production'],
  },
  {
    id: 'data-flywheel',
    navLabel: 'Data flywheel',
    level: 'ai-llm-mlops',
    title: 'The data flywheel',
    summary: 'Production traces become new eval cases and training data, and drift ages yesterday\'s eval.',
    what: 'Capture real requests and outcomes, label the informative ones, and feed them back into the eval set and the training or prompt-tuning data.',
    why:
      'Whatever test set you wrote before launch reflects what you imagined users would do. Real traffic shows what they actually do, including the failures you did not predict. So the best new test cases are production failures: capture traces, sample and label them (with users\' feedback, human review or a calibrated judge), and add them to the golden set so the same failure cannot return unnoticed. The same labeled data can improve the system, as fine-tuning data or as better examples and retrieval content. The loop only works if it is maintained: inputs drift, so an eval set frozen last quarter measures last quarter\'s traffic, and a passing score can mean the test is stale rather than the system is good. Refresh the set on a schedule and track the share of recent production cases in it.',
    how: [
      'Store traces with inputs, outputs, tool calls and user feedback, with sensitive data redacted.',
      'Sample for review: failures, low-confidence cases and a random slice to avoid bias.',
      'Label and add the cases to the eval set with a version and date.',
      'Use the labeled data for fine-tuning or prompt improvements, and re-run evals to confirm the gain.',
      'Compare the eval set\'s distribution with recent traffic and refresh when they diverge.',
    ],
    stageIds: ['observe', 'learn', 'define'],
    tools: ['Trace stores', 'Labeling queues', 'Feedback signals', 'Dataset versioning'],
    breaksWhere:
      'Feedback is biased toward users who respond, labels are noisy, and training on the system\'s own outputs can reinforce its errors. Privacy rules limit what traces you can keep and reuse.',
    sourceBookIds: ['evals-for-ai-engineers', 'designing-machine-learning-systems', 'ai-engineering', 'observability-engineering'],
  },
];
