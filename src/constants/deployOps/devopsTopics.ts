/**
 * DevOps first-principles topics: each technology derived from the problem it
 * was built to solve. Release strategy YAML lives in strategies.ts, not here.
 */

import type { FirstPrinciplesTopic } from './types';

export const DEVOPS_TOPICS: FirstPrinciplesTopic[] = [
  {
    id: 'version-control',
    navLabel: 'Version control',
    level: 'devops',
    title: 'Version control: a history nobody can quietly rewrite',
    summary:
      'Git stores every state of the code as content-addressed objects, so any change is attributable, comparable, and reversible.',
    what:
      'A system that records snapshots of a project over time, lets many people change it in parallel, and merges their work back into one shared line of history.',
    why:
      'Software changes constantly, and people change it at the same time. Without a recorded history, you cannot answer "what changed before it broke?" or undo a bad change. Git solves this by naming each snapshot with a hash of its own content. If any byte of the content or its parent changes, the name changes, so history cannot be altered silently. Branches are just cheap pointers to snapshots, which makes parallel work and merging inexpensive. The remaining problem is that long-lived branches drift apart and merging them gets painful, so the longer work stays unmerged, the more it costs to integrate.',
    how: [
      'Commit small, self-contained changes. Each commit is a hash-named snapshot that points to its parent, forming a verifiable chain.',
      'Prefer trunk-based development: short-lived branches (hours to a day or two) merged to one main branch, so integration problems surface early while they are small.',
      'Protect the trunk with required review and required status checks, so the only way in is through verification.',
      'Use feature flags to separate deploying code from releasing behavior. Unfinished work can merge to trunk behind a flag that is off, and turning it on later needs no new deploy.',
      'Remove flags once a feature is fully rolled out. Stale flags are hidden branches in your logic and multiply the states you must test.',
    ],
    stageIds: ['define', 'version'],
    tools: ['Git', 'GitHub', 'GitLab', 'Feature flag services'],
    breaksWhere:
      'Git tracks text well but handles large binaries and generated data poorly. Content addressing proves history was not altered after the fact; it does not prove a commit is correct or that its author is who they claim (that needs commit signing). Feature flags add runtime branching that must be tested in both states.',
    sourceBookIds: ['accelerate', 'devops-handbook'],
  },
  {
    id: 'continuous-integration',
    navLabel: 'Continuous integration',
    level: 'devops',
    title: 'Continuous integration: verification nobody can skip',
    summary:
      'Every change is built and tested automatically in a clean environment before it can join the shared trunk.',
    what:
      'An automated pipeline that runs on every proposed change: it builds the software, runs tests and static checks, and reports pass or fail as a gate on merging.',
    why:
      'Humans forget steps, and "it works on my machine" is not evidence. If verification depends on someone remembering to run it, it will eventually be skipped under pressure. Making the checks automatic, identical for everyone, and a precondition of merging turns verification from a habit into a property of the system. Running on each small change also means a failure points at a small diff, which keeps diagnosis cheap.',
    how: [
      'Run the build and tests on every pull request in a clean, disposable environment, and require a green result before merge.',
      'Shape tests as a pyramid: many fast unit tests, fewer integration tests, and a small number of end-to-end tests. Slow, broad tests are expensive and fail for more reasons.',
      'Keep the pipeline fast (minutes, not hours). A slow gate trains people to batch changes, which brings back large, risky merges.',
      'Adopt a flaky-test policy: a test that fails intermittently is quarantined or fixed with an owner and deadline. Automatic retry-until-green hides the problem and teaches people to ignore red.',
      'Build the artifact once in CI and promote that same artifact onward, instead of rebuilding for each environment.',
    ],
    stageIds: ['verify', 'build'],
    tools: ['GitHub Actions', 'GitLab CI', 'Jenkins', 'CircleCI'],
    breaksWhere:
      'A green pipeline shows only that the checks you wrote passed. It cannot catch what no test covers, and tests with shared state or timing assumptions give false signals in both directions. A gate that people can bypass, or that is routinely flaky, stops being a gate.',
    sourceBookIds: ['accelerate', 'devops-handbook'],
  },
  {
    id: 'containers',
    navLabel: 'Containers',
    level: 'devops',
    title: 'Containers: ship the environment with the code',
    summary:
      'A container image bundles the application with its filesystem dependencies so it runs the same way wherever a runtime exists.',
    what:
      'A container is an ordinary process isolated by operating-system features (namespaces and cgroups on Linux) and started from an image: a layered, read-only filesystem snapshot holding the app and its libraries.',
    why:
      'A program depends on more than its own code: the OS libraries, language runtime, and package versions around it. When those differ between a laptop, CI, and production, the same code behaves differently. Containers make that environment part of the artifact you build and test, so what you verified is much closer to what runs. They are lighter than virtual machines because they share the host kernel rather than booting their own.',
    how: [
      'Describe the environment in a Dockerfile (or equivalent) and build it in CI so the image is produced by an automated, repeatable step.',
      'Pin the base image by digest (sha256), not just a tag. Tags such as "latest" or "20" are movable pointers; a digest names exact content.',
      'Use lockfiles for language dependencies and install from them, so transitive versions do not shift between builds.',
      'Keep images small and single-purpose, run as a non-root user, and put volatile layers (application code) after stable ones to use build caching.',
      'Treat the image as immutable: to change anything, build a new image rather than modifying a running container.',
    ],
    stageIds: ['build', 'deploy'],
    tools: ['Docker', 'Podman', 'BuildKit', 'containerd'],
    breaksWhere:
      'Containers are mostly reproducible, not hermetic. Builds often fetch packages from the network, embed timestamps, and depend on the host kernel and CPU architecture, so two builds of the same Dockerfile can produce different bytes. Digest pinning and lockfiles narrow the gap; fully hermetic builds need dedicated tooling such as Bazel or Nix. Containers also share a kernel, so isolation is weaker than a virtual machine.',
    sourceBookIds: ['devops-handbook', 'kubernetes-up-and-running'],
  },
  {
    id: 'artifact-registries',
    navLabel: 'Artifact registries',
    level: 'devops',
    title: 'Artifact registries: one immutable thing, with a paper trail',
    summary:
      'A registry stores built artifacts by content digest so you can deploy exactly what was tested and prove where it came from.',
    what:
      'A server that stores and distributes build outputs (container images, packages) and lets you look them up by name, tag, or content digest.',
    why:
      'Between "tests passed" and "running in production" there is a gap in which the thing you verified could be swapped, rebuilt differently, or tampered with. If you deploy by a movable tag, you cannot be sure which bytes you got. Storing artifacts immutably, addressing them by digest, and attaching evidence of how they were built closes that gap: the exact bytes that passed verification are the bytes that run, and you can show their origin.',
    how: [
      'Deploy by digest (image@sha256:...), not by :latest or a mutable version tag. A digest cannot point at different content later, so rollback and audit are exact.',
      'Make tags immutable where the registry supports it, and never overwrite a released version.',
      'Record provenance: which commit, which builder, and which build inputs produced the artifact (for example SLSA-style attestations).',
      'Generate a software bill of materials (SBOM) listing the components inside the artifact, so a newly disclosed vulnerability can be matched to what you ship.',
      'Sign artifacts (for example with Sigstore cosign) and have the cluster or deploy step verify the signature before running them.',
    ],
    stageIds: ['build', 'release'],
    tools: ['Docker Hub', 'GitHub Container Registry', 'Amazon ECR', 'Google Artifact Registry', 'Harbor', 'cosign', 'Syft'],
    breaksWhere:
      'A signature proves who signed an artifact, not that its contents are safe. An SBOM is only as accurate as the tool that generated it, and provenance is trustworthy only if the build system itself is. Digests also make manifests harder to read, so tooling should resolve and record them automatically.',
    sourceBookIds: ['devops-handbook', 'accelerate'],
  },
  {
    id: 'kubernetes',
    navLabel: 'Kubernetes',
    level: 'devops',
    title: 'Kubernetes: reconcile desired state against reality',
    summary:
      'Machines and processes fail, so you declare what should exist and controllers continuously correct the difference.',
    what:
      'A container orchestrator. You submit declarative objects describing the desired state (how many copies, which image, what resources), and controllers act to make the actual state match.',
    why:
      'At any scale, machines fail, processes crash, and networks partition. Manually issuing commands to react to each failure does not scale and is error-prone. The alternative is to store desired state in one place, observe actual state, and run a loop that compares the two and acts on the difference. That reconcile loop is the core idea: a crashed pod is replaced not because someone reacted, but because the actual count no longer matches the declared count. Because the loop is level-triggered (it looks at current state, not at events it might have missed), it recovers from missed notifications too.',
    how: [
      'A Deployment declares the desired Pod template and replica count; its controller maintains a ReplicaSet and performs rolling updates when the template changes.',
      'A Service gives a stable virtual address and load balancing across a changing set of Pods selected by labels.',
      'Readiness probe: answers "should this Pod receive traffic now?". A failing Pod is removed from Service endpoints but not restarted.',
      'Liveness probe: answers "is this process stuck so badly that a restart helps?". Failure causes a restart. It must check only the process itself, never dependencies such as the database; otherwise a dependency outage makes every Pod restart in a loop and turns a partial failure into a total one.',
      'Startup probe: gives slow-starting applications time to boot before liveness checks begin, so a long start is not mistaken for a hang.',
      'Set resource requests and limits so the scheduler can place Pods sensibly and one workload cannot starve another.',
    ],
    stageIds: ['deploy', 'operate'],
    tools: ['Kubernetes', 'kubectl', 'Helm', 'Kustomize', 'k3s'],
    breaksWhere:
      'Reconciliation only corrects what controllers know how to observe. Stateful systems, networking, and security add substantial complexity, and Kubernetes itself is a distributed system you must operate or pay someone to. For a handful of simple services, a managed platform is often a better trade. A Pod passing readiness does not mean the application is correct, only that it answers its check.',
    sourceBookIds: ['kubernetes-up-and-running', 'site-reliability-engineering'],
  },
  {
    id: 'infrastructure-as-code-and-gitops',
    navLabel: 'IaC and GitOps',
    level: 'devops',
    title: 'Infrastructure as code and GitOps: the repository is the source of truth',
    summary:
      'Describe infrastructure in versioned files, apply them idempotently, and let git history be the record of every change.',
    what:
      'Infrastructure as code (IaC) defines servers, networks, and platform configuration in text files. GitOps is the practice of making a git repository the single source of truth for desired state, with an automated agent applying what is merged.',
    why:
      'Clicking through consoles leaves no review, no history, and no way to recreate an environment. If infrastructure is text in version control, it inherits everything version control offers: code review, diffs, blame, and revert. GitOps adds a second idea: if an agent continuously compares the cluster to the repository, then deploying is just merging, rollback is just reverting, and unapproved manual changes show up as drift rather than lingering unnoticed.',
    how: [
      'Express infrastructure declaratively (Terraform, Kubernetes manifests) and review changes as pull requests, including the plan or diff of what will change.',
      'Make apply idempotent: running it repeatedly converges on the same result, so retries and re-runs are safe.',
      'Use a pull-based agent (Argo CD, Flux) that watches the repository and reconciles the cluster toward it. Deploy = merge; rollback = revert the commit.',
      'Detect drift: compare live state to declared state on a schedule and either alert or auto-correct, so out-of-band edits do not accumulate.',
      'Change databases with expand/contract migrations: first add the new column or table in a backward-compatible way (expand), deploy code that works with both shapes, migrate data, and only later remove the old shape (contract). This lets old and new code coexist and keeps rollback possible.',
      'Keep secrets out of plain-text repositories; reference them from a secrets manager or store them encrypted.',
    ],
    stageIds: ['define', 'deploy', 'operate'],
    tools: ['Terraform', 'OpenTofu', 'Pulumi', 'Argo CD', 'Flux', 'Ansible'],
    breaksWhere:
      'Reverting a commit restores configuration but not data: a destructive migration or deleted resource cannot be undone by git. Declarative tools can still hold state files that drift or get corrupted, and imperative one-off changes (hotfixes) tempt people around the process. Auto-correcting drift can also overwrite a deliberate emergency change.',
    sourceBookIds: ['devops-handbook', 'site-reliability-engineering', 'kubernetes-up-and-running'],
  },
  {
    id: 'release-strategies',
    navLabel: 'Release strategies',
    level: 'devops',
    title: 'Release strategies: how much of the risk you take at once',
    summary:
      'Each strategy controls a different part of the question: who sees the new version, when, and how fast you can undo it.',
    what:
      'A release strategy is the mechanism that moves users from the old version to the new one. The six common ones are recreate, rolling, blue-green, canary, A/B testing, and shadow.',
    why:
      'No amount of pre-production testing reproduces real traffic, so some risk always remains at release. You cannot remove it, but you can choose how much of it to expose before learning whether the change is healthy. Each strategy trades resource cost and complexity against blast radius (how many users a bad version can hurt) and rollback speed. Picking one is a decision about the specific risk you are trying to contain.',
    how: [
      'Recreate stops the old version, then starts the new one. It is simple and lets v1 and v2 never coexist, but it always has downtime.',
      'Rolling replaces instances gradually, so capacity stays up. Old and new versions run together briefly, so they must be compatible, and rollback is another rolling update.',
      'Blue-green runs a full second environment and switches traffic at once. Rollback is switching back, at the cost of double capacity and a shared database that both versions must tolerate.',
      'Canary sends a small, controlled share of real traffic to the new version and widens it only if metrics stay healthy. Weighted routing needs a service mesh or the Gateway API (plain Services split by replica count only), and the value comes from real SLO-based gating of each step. Argo Rollouts and Flagger automate the analysis and promotion.',
      'A/B testing routes users by a rule (cohort, header) to compare behavior. It is an experiment about product outcomes, not a safety mechanism; a variant can win the experiment and still be unreliable.',
      'Shadow (traffic mirroring) copies real requests to the new version and discards its responses, testing it against production load with no user impact. It duplicates side effects: payments, emails, and database writes happen twice unless the shadow path is isolated or stubbed.',
    ],
    stageIds: ['release', 'deploy'],
    tools: ['Argo Rollouts', 'Flagger', 'Istio', 'Gateway API', 'Linkerd', 'LaunchDarkly'],
    breaksWhere:
      'A canary is only as good as the metrics gating it: with too little traffic or a vague health signal, it provides false comfort. No strategy fixes incompatible schema changes between versions; that needs expand/contract migrations. The YAML for each strategy is in the strategy reference section and is illustrative.',
    comparison: {
      caption: 'What each release strategy controls',
      rowHeader: 'Strategy',
      columns: ['Mechanism', 'Risk it controls', 'Main cost or limit'],
      rows: [
        {
          id: 'recreate',
          label: 'Recreate',
          cells: [
            'Stop all old instances, then start new ones',
            'Version coexistence (v1 and v2 never run together)',
            'Always has downtime',
          ],
        },
        {
          id: 'rolling',
          label: 'Rolling',
          cells: [
            'Replace instances in batches while the rest keep serving',
            'Loss of capacity during the update',
            'v1 and v2 coexist, so they must be compatible; slow to roll back',
          ],
        },
        {
          id: 'blue-green',
          label: 'Blue-green',
          cells: [
            'Stand up a full parallel environment, then switch traffic at once',
            'Slow rollback and untested-in-place deploys',
            'Double capacity; shared data stores must work with both versions',
          ],
        },
        {
          id: 'canary',
          label: 'Canary',
          cells: [
            'Send a small share of real traffic to the new version, widen on healthy metrics',
            'Blast radius of a bad version',
            'Needs weighted routing (mesh or Gateway API) and real SLO gating; low traffic weakens the signal',
          ],
        },
        {
          id: 'ab-testing',
          label: 'A/B testing',
          cells: [
            'Route defined user cohorts to different variants',
            'Uncertainty about product impact (not reliability)',
            'An experiment, not a safety mechanism; needs enough users for statistical confidence',
          ],
        },
        {
          id: 'shadow',
          label: 'Shadow',
          cells: [
            'Mirror real requests to the new version and discard its responses',
            'Behavior under real load without user exposure',
            'Duplicates side effects (writes, emails, payments); extra load and cost',
          ],
        },
      ],
    },
    sourceBookIds: ['devops-handbook', 'site-reliability-engineering', 'accelerate'],
  },
  {
    id: 'observability',
    navLabel: 'Observability',
    level: 'devops',
    title: 'Observability: asking questions you did not plan for',
    summary:
      'Monitoring watches for failures you predicted; observability lets you investigate failures you did not.',
    what:
      'Observability is the ability to understand a system\'s internal behavior from the data it emits. Monitoring checks known conditions against thresholds; observability supports asking new, arbitrary questions after the fact.',
    why:
      'Distributed systems fail in ways nobody predicted, so a fixed set of dashboards and alerts will always miss some failures. To debug an unfamiliar problem you need rich, high-detail data you can slice by any dimension (user, version, region, endpoint) rather than pre-aggregated numbers. And because you cannot alert on everything, you need a principled way to decide what matters to users and when to act: that is the role of service level objectives.',
    how: [
      'Emit the main signal types: logs (discrete events), metrics (cheap numeric aggregates over time), and traces (a request\'s path across services). Wide, structured events with many fields per request are especially useful for ad hoc questions.',
      'Propagate a correlation (trace) id through every service and log line so one request can be followed end to end.',
      'Define SLIs (measurable indicators, such as the fraction of requests that succeed under a latency bound) and SLOs (the target, such as 99.9% over 30 days). The error budget is the allowed shortfall, which turns "how reliable" into a number you can spend on releases.',
      'Alert on burn rate (how fast the error budget is being consumed), not on every raw spike. Multi-window burn-rate alerts catch both fast and slow burns with fewer false pages.',
      'Use burn-rate checks as rollback gates: if a new version burns budget faster than allowed during a canary or bake window, halt or roll back automatically.',
      'Scrub personal data and secrets from telemetry before it is stored.',
    ],
    stageIds: ['observe', 'operate', 'learn'],
    tools: ['OpenTelemetry', 'Prometheus', 'Grafana', 'Jaeger', 'Honeycomb', 'Loki'],
    breaksWhere:
      'More telemetry is not automatically better: high-cardinality data is costly to store and query, and noisy alerts cause fatigue. Observability does not help if teams do not look at it or cannot act on it, and SLOs set without input from users or the business can optimize the wrong thing. Sampling traces can drop exactly the rare request you needed.',
    sourceBookIds: ['observability-engineering', 'site-reliability-engineering'],
  },
  {
    id: 'delivery-metrics',
    navLabel: 'Delivery metrics',
    level: 'devops',
    title: 'Delivery metrics: measuring loop speed and loop safety',
    summary:
      'The DORA metrics describe how quickly changes flow to production and how often that flow causes trouble.',
    what:
      'DORA (DevOps Research and Assessment) identified software delivery metrics that correlate with organizational performance. As presented at dora.dev there are five, grouped into throughput and instability.',
    why:
      'Teams argue about whether they are "doing DevOps well" using opinions. Delivery is a feedback loop: change goes out, you learn what happened, and you adjust. Two properties of that loop can be measured: how fast it turns, and how safe each turn is. The research finding is that speed and stability tend to go together rather than trade off, because small, frequent, well-verified changes are both quicker to ship and easier to fix. Measuring both prevents optimizing one at the expense of the other.',
    how: [
      'Throughput: Change Lead Time (time from a code change being committed to running in production) and Deployment Frequency (how often you deploy to production).',
      'Instability: Failed Deployment Recovery Time (how long it takes to recover when a deployment causes a failure), Change Fail Rate (the share of deployments that need immediate intervention such as a rollback or hotfix), and Deployment Rework Rate (the share of deployments that are unplanned, made to fix a user-facing problem from an earlier deployment).',
      'Collect them from systems that already record the facts (version control, CI, deploy and incident tooling) instead of asking people to report them.',
      'Read them as trends per team or service, not as targets to hit. Use them to find the constraint in your loop, such as slow reviews or a manual release step.',
    ],
    stageIds: ['learn', 'release'],
    tools: ['dora.dev Quick Check', 'Four Keys', 'Sleuth', 'LinearB'],
    breaksWhere:
      'These are indicators of loop speed and safety, not of product value or developer happiness. When a metric becomes a target it gets gamed (for example, splitting deploys to inflate frequency), and comparing numbers across teams with different systems and risk profiles is misleading. Definitions of "failure" and "deployment" vary and must be fixed consistently before trends mean anything. Check dora.dev for the current definitions, since the set has changed over time.',
    sourceBookIds: ['accelerate', 'devops-handbook'],
  },
  {
    id: 'twelve-factor-config',
    navLabel: 'Twelve-factor config',
    level: 'devops',
    title: 'Twelve-factor config: one build, many environments',
    summary:
      'Keep what varies between environments outside the build, so the same artifact runs everywhere.',
    what:
      'The twelve-factor methodology is a set of rules for building apps that deploy cleanly as services. Four matter most here: store config in the environment, keep secrets out of the image, separate build/release/run, and keep development close to production.',
    why:
      'If you must rebuild the software to change a database address or a feature setting, then the artifact you tested is not the one you deploy, and you lose the guarantee of the earlier stages. Separating the code (the same everywhere) from configuration (different per environment) lets one verified artifact be promoted unchanged. Secrets add a second concern: anything baked into an image or committed to a repository is copied everywhere the image goes and is hard to revoke.',
    how: [
      'Read configuration from environment variables or a mounted config source at startup, not from values compiled or committed into the code.',
      'Never put secrets in the image or repository. Inject them at runtime from a secrets manager or the platform\'s secret store, and rotate them.',
      'Separate the stages: build produces an immutable artifact, release combines that artifact with environment config, and run executes a release. Releases are numbered and can be rolled back.',
      'Keep dev, staging, and production as similar as practical (same backing services types, same artifact, small time gap between writing and deploying code) to reduce "works here only" surprises.',
      'Treat backing services (databases, queues) as attached resources addressed by config, so swapping one is a config change.',
    ],
    stageIds: ['build', 'release', 'deploy'],
    tools: ['Environment variables', 'Kubernetes ConfigMap and Secret', 'HashiCorp Vault', 'AWS Secrets Manager', 'dotenv'],
    breaksWhere:
      'Environment variables are visible to every process of the app and often leak into logs, crash dumps, and child processes, so they are not a strong secrets boundary by themselves. Complex nested configuration fits poorly into flat variables. Perfect dev/prod parity is rarely affordable, so know which differences (scale, data volume, network) you are accepting.',
    sourceBookIds: ['devops-handbook', 'kubernetes-up-and-running'],
  },
];
