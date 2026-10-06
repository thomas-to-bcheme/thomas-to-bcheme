import type { DeterminismTopicGroup } from '@/types/deployOps';

/**
 * AI/ML layer. Every card has the same shape on purpose:
 *   SWE principle -> ML extension -> tools -> trade-offs -> where determinism breaks.
 *
 * Version-specific claims worth re-checking against official docs before they
 * are quoted elsewhere: MLflow stages -> aliases migration, TorchScript's
 * maintenance status vs torch.export, Ray Tune scheduler details.
 */
export const MLOPS_TOPICS: readonly DeterminismTopicGroup[] = [
  {
    id: 'data-features',
    label: 'Data & features',
    cards: [
      {
        id: 'data-version-control',
        title: 'Data version control',
        layer: 'ml',
        iconName: 'Database',
        swePrinciple: 'Lockfiles and immutable commits for code.',
        extension:
          'A training run is a function of code AND data. Pin the dataset the way you pin dependencies: content hashes and snapshot ids, with lineage from input hashes + code commit + params to output hash.',
        tools: ['DVC (pointer files + remote cache)', 'lakeFS (git-like branches over object storage)', 'Delta / Iceberg time travel'],
        tradeoffs: [
          'Storage grows with every snapshot; dedup and retention policy are part of the design.',
          'Branching big data is cheap in lakeFS-style metadata, expensive if you copy objects.',
        ],
        breaksWhere:
          'Mutable upstream sources, non-reproducible sampling or shuffles, and deletion requests (GDPR) that conflict with immutable history.',
      },
      {
        id: 'feature-stores',
        title: 'Feature stores & training/serving skew',
        layer: 'ml',
        iconName: 'Database',
        swePrinciple: 'One source of truth; do not duplicate logic across environments.',
        extension:
          'Define each feature transformation once and serve it to both the offline (training) and online (serving) paths, with point-in-time-correct joins so training never sees the future.',
        tools: ['Feast', 'Tecton'],
        tradeoffs: [
          'Online store adds a low-latency dependency and a staleness (TTL) budget.',
          'A shared definition costs flexibility: ad-hoc notebook features must be promoted before they ship.',
        ],
        breaksWhere:
          'Skew creeps back through duplicated transformation code, time-travel leakage, and stale online values. Log serving features and compare them with training features.',
      },
    ],
  },
  {
    id: 'experiments-registry',
    label: 'Experiments & registry',
    cards: [
      {
        id: 'experiment-tracking',
        title: 'Experiment tracking',
        layer: 'ml',
        iconName: 'FlaskRound',
        swePrinciple: 'A build is traceable to the commit that produced it.',
        extension:
          'Record params, metrics, artifacts, code SHA, data hash, environment and seeds for every run so any model can be traced and re-derived.',
        tools: ['MLflow Tracking', 'MLflow Projects (MLproject + conda/docker env)'],
        tradeoffs: [
          'Logging everything costs storage and discipline; logging too little makes runs unreproducible.',
        ],
        breaksWhere:
          'A tracked run is only as reproducible as its unlogged inputs: untracked data, unpinned drivers, and unseeded nondeterminism.',
      },
      {
        id: 'model-registry',
        title: 'Model registry',
        layer: 'ml',
        iconName: 'Package',
        swePrinciple: 'Immutable versions (commits) plus movable pointers (tags, branches).',
        extension:
          'Registry versions are immutable and carry lineage back to the run. Promotion is moving an alias such as champion or challenger, not editing a version. MLflow stages (Staging/Production/Archived) are deprecated in favor of aliases and tags.',
        tools: ['MLflow Registry aliases (models:/name@alias)', 'Tags for review state'],
        tradeoffs: [
          'Aliases move without a code review unless alias changes are audited or gated.',
        ],
        breaksWhere:
          'Rollback only works if the data and feature definitions behind the old version still exist. Repointing an alias cannot recreate a model whose training data was lost.',
      },
    ],
  },
  {
    id: 'training-scale',
    label: 'Training at scale',
    cards: [
      {
        id: 'distributed-training',
        title: 'Distributed training & memory',
        layer: 'ml',
        iconName: 'Cpu',
        swePrinciple: 'Scale out without changing behavior: horizontal replication of a deterministic unit.',
        extension:
          'DDP replicates the whole model and all-reduces gradients. FSDP / ZeRO shards parameters, gradients and optimizer state, with optional CPU offload. Tensor parallelism splits layers within a node; pipeline parallelism splits stages and pays a bubble. Activation checkpointing trades compute for memory; gradient accumulation buys a larger effective batch.',
        tools: ['PyTorch DDP', 'PyTorch FSDP / DeepSpeed ZeRO', 'Megatron-style tensor/pipeline parallelism'],
        tradeoffs: [
          'DDP: highest throughput per GPU, but every GPU holds the full model, so it caps at single-GPU memory.',
          'FSDP: fits much larger models, at the cost of extra all-gather communication.',
          'Pipeline parallel: scales across nodes, but idle bubbles waste utilization.',
          'Activation checkpointing: roughly a third more compute for a large activation-memory cut.',
        ],
        breaksWhere:
          'Floating-point reductions are not associative, NCCL ordering varies, and some CUDA kernels are nondeterministic. Bitwise reproducibility needs deterministic-algorithm flags and a fixed topology, and it costs speed.',
      },
    ],
  },
  {
    id: 'hpo-ct',
    label: 'HPO & continuous training',
    cards: [
      {
        id: 'hyperparameter-optimization',
        title: 'Hyperparameter optimization',
        layer: 'ml',
        iconName: 'SlidersHorizontal',
        swePrinciple: 'Parameterize behavior; tests should explore the space rather than hard-code one point.',
        extension:
          'Grid search scales exponentially with dimensions; random search covers important dimensions better for the same budget. Bayesian methods (Gaussian-process or TPE surrogates with an acquisition function such as Expected Improvement) spend trials where improvement is likely. Schedulers stop weak trials early.',
        tools: ['Optuna (TPE)', 'Ray Tune with ASHA / Hyperband', 'Population-Based Training'],
        tradeoffs: [
          'Bayesian optimization is sample-efficient but sequential, so it parallelizes less well than random search.',
          'Early stopping saves compute but can kill slow starters.',
        ],
        breaksWhere:
          'PBT mutates hyperparameters mid-run, so the final model is not reproducible from a single config. Log the search space, seeds and the whole schedule.',
      },
      {
        id: 'continuous-training-drift',
        title: 'Continuous training & drift',
        layer: 'ml',
        iconName: 'Activity',
        swePrinciple: 'Monitoring and automated rollback gates.',
        extension:
          'Retrain on a schedule, on drift, or on a performance drop, and gate the new model through validation before promotion. Covariate (data) drift is measurable immediately with PSI, KS or Jensen-Shannon; concept drift (P(y|x) changes) usually shows only through delayed labels.',
        tools: ['PSI / KS tests', 'Prediction-drift dashboards', 'Champion/challenger evaluation'],
        tradeoffs: [
          'Aggressive retraining chases noise; conservative retraining ships a stale model.',
        ],
        breaksWhere:
          'Ground truth arrives late and thresholds are statistical, so "drifted" is a judgment call that must be tuned, not asserted.',
      },
    ],
  },
  {
    id: 'packaging-serving',
    label: 'Packaging & serving',
    cards: [
      {
        id: 'serialization',
        title: 'Model serialization',
        layer: 'ml',
        iconName: 'Package',
        swePrinciple: 'Supply-chain hygiene: do not run code you cannot verify.',
        extension:
          'Decouple the trained model from its training runtime with portable formats. Treat pickle-based loading as code execution.',
        tools: ['ONNX', 'safetensors (tensors only, no code execution)', 'SavedModel', 'TorchScript (maintenance mode; torch.export is the successor)'],
        tradeoffs: [
          'ONNX buys runtime portability but operator support differs, so numerical output is not guaranteed equal.',
          'safetensors is safe and mmap-friendly but stores weights only, not architecture.',
        ],
        breaksWhere:
          'torch.load on an untrusted .pt or .pkl can execute arbitrary code. Use weights_only=True, safetensors, hash or signature verification, and an allowlist for third-party hub models.',
      },
      {
        id: 'serving-containers',
        title: 'Serving & GPU containers',
        layer: 'ml',
        iconName: 'Rocket',
        swePrinciple: 'Immutable, digest-pinned images and idempotent batch jobs.',
        extension:
          'Expose the model behind a stable contract and package it as an immutable image. Pin the CUDA/cuDNN base by digest and match the host driver. Batch inference is offline, throughput-oriented and idempotent by input hash; online inference is bound by a latency SLO.',
        tools: ['FastAPI (custom REST + Swagger UI)', 'TensorFlow Serving', 'Triton', 'vLLM', 'Docker + NVIDIA Container Toolkit', 'Apache Airflow (batch)'],
        tradeoffs: [
          'Online: lowest latency, but you pay for always-on GPUs.',
          'Batch: best throughput per dollar, but results are stale between runs.',
          'GPU images are large; layer caching and multi-stage builds matter.',
        ],
        breaksWhere:
          'Batch size changes numerics, so dynamic batching makes outputs depend on concurrent traffic. Detect GPU architecture at runtime instead of hardcoding it.',
      },
    ],
  },
];
