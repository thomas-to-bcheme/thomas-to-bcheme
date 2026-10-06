import type {
  DeterminismPillar,
  DeterminismSpectrumStep,
  LifecycleStage,
} from '@/types/deployOps';

/**
 * Foundation layer: traditional software DevOps. These are the deterministic
 * guarantees the ML/LLM layers are built on -- if the code, build and deploy
 * path are not reproducible, no amount of eval discipline can localize a
 * regression to the model.
 *
 * Rollback is deliberately NOT a final stage: Monitor decides between
 * promoting and rolling back, so it is modelled as the loop's branch.
 */
export const LIFECYCLE_STAGES: readonly LifecycleStage[] = [
  {
    id: 'commit',
    label: 'Commit',
    iconName: 'GitCommitHorizontal',
    artifact: 'Short-lived branch merged to trunk',
    gate: 'Required review + status checks',
  },
  {
    id: 'build',
    label: 'Build',
    iconName: 'Hammer',
    artifact: 'One immutable image per commit, addressed by sha256 digest',
    gate: 'Lockfile install, pinned base image, SBOM + signature',
  },
  {
    id: 'test',
    label: 'Test',
    iconName: 'FlaskConical',
    artifact: 'Test report on that exact digest',
    gate: 'Test pyramid green; flaky tests quarantined, never retried-until-green',
  },
  {
    id: 'deploy',
    label: 'Deploy',
    iconName: 'Rocket',
    artifact: 'The same digest promoted dev -> staging -> prod',
    gate: 'Idempotent apply; readiness probes; post-deploy smoke test',
  },
  {
    id: 'monitor',
    label: 'Monitor',
    iconName: 'Activity',
    artifact: 'SLIs against SLOs, traces, structured logs',
    gate: 'Error rate / p99 / burn rate inside the bake window',
  },
  {
    id: 'decide',
    label: 'Promote or Roll back',
    iconName: 'Undo2',
    artifact: 'Redeploy the previous known-good digest, or widen the rollout',
    gate: 'Automated on SLO breach; in GitOps, rollback is a git revert',
  },
];

export const DETERMINISM_PILLARS: readonly DeterminismPillar[] = [
  {
    id: 'lockfiles',
    title: 'Lockfiles & pinned bases',
    summary:
      'Commit lockfiles and install with npm ci / --require-hashes. Pin base images as image:tag@sha256:...; a tag alone is mutable.',
  },
  {
    id: 'immutable-artifacts',
    title: 'Immutable, digest-addressed artifacts',
    summary:
      'Deploy by digest, never :latest. Version is a human label; the digest is the identity. Promote one build through environments instead of rebuilding per environment.',
  },
  {
    id: 'gitops',
    title: 'IaC & GitOps',
    summary:
      'Git holds desired state; a controller reconciles and detects drift. Manual kubectl edits get reverted, so rollback is a revert commit.',
  },
  {
    id: 'idempotent-deploys',
    title: 'Idempotent deploys',
    summary:
      'Applying the same manifest N times gives the same result. Schema changes follow expand/contract so old and new versions can coexist.',
  },
  {
    id: 'twelve-factor',
    title: '12-factor config',
    summary:
      'Config lives in the environment, secrets never in the image, build/release/run are separate, logs are streams.',
  },
  {
    id: 'test-pyramid',
    title: 'Test pyramid',
    summary:
      'Many fast unit tests, fewer integration tests, a few E2E happy paths. Fixed seeds and clocks keep tests repeatable.',
  },
  {
    id: 'slo-gates',
    title: 'SLOs as release gates',
    summary:
      'Error budgets gate velocity. Liveness, readiness and startup probes are distinct, and liveness must not check dependencies or an outage becomes a restart storm.',
  },
  {
    id: 'reproducibility-honesty',
    title: 'Reproducible, with honest limits',
    summary:
      'A pinned Dockerfile is mostly reproducible, not hermetic. True hermetic builds need Bazel or Nix-class tooling.',
  },
];

/** Ordered from strongest to weakest guarantee: this is where each layer lives. */
export const DETERMINISM_SPECTRUM: readonly DeterminismSpectrumStep[] = [
  {
    id: 'bit-exact',
    label: 'Bit-exact',
    example: 'Builds and deploys',
    guarantee: 'Same inputs, same digest. Assert equality.',
  },
  {
    id: 'seeded',
    label: 'Seeded-reproducible',
    example: 'Model training',
    guarantee:
      'Same seed, data snapshot and topology land within tolerance. GPU float reductions and NCCL ordering break bitwise equality.',
  },
  {
    id: 'statistical',
    label: 'Statistically stable',
    example: 'LLM outputs and evals',
    guarantee:
      'Assert on pass rates over N runs with confidence intervals, never on exact strings.',
  },
];
