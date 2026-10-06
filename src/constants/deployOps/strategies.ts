import type { DeployStrategy } from '@/types/deployOps';

/**
 * Six release strategies, each with a Kubernetes manifest and a GitHub Actions
 * job fragment.
 *
 * Snippets are illustrative and parameterized: every ${PLACEHOLDER} is listed in
 * the strategy's `variables` and is meant to be rendered (envsubst, Helm or
 * Kustomize) rather than edited by hand. Nothing here is this repo's own
 * workflow -- this site deploys through Vercel, where previews and instant
 * rollback are built in. Canary / A-B / Shadow assume Istio; plain Kubernetes
 * has no native weighted routing.
 *
 * Third-party actions must be pinned to commit SHAs in a real pipeline. The
 * kubeconfig / OIDC auth step is omitted from every job fragment.
 */

const ISTIO_SUBSETS = `apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: \${APP_NAME}
  namespace: \${NAMESPACE}
spec:
  host: \${APP_NAME}
  subsets:
    - name: stable
      labels:
        version: stable
    - name: next
      labels:
        version: next`;

export const DEPLOY_STRATEGIES: readonly DeployStrategy[] = [
  {
    id: 'recreate',
    name: 'Recreate',
    tagline: 'Tear down the old version, then bring up the new one.',
    useWhen:
      'Downtime is acceptable, or v1 and v2 cannot coexist (breaking schema, singleton worker, dev or batch environments).',
    rollback: 'Redeploy the old version, which is a second outage.',
    resourceCost: '1x',
    risk: 'High blast radius: every user sees the gap.',
    caveat: 'Recreate always has downtime. Do not describe it as zero-downtime.',
    variables: ['APP_NAME', 'NAMESPACE', 'IMAGE', 'REPLICAS', 'CONTAINER_PORT'],
    snippets: [
      {
        title: 'deployment.yaml',
        language: 'yaml',
        code: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: \${APP_NAME}
  namespace: \${NAMESPACE}
spec:
  replicas: \${REPLICAS}
  strategy:
    type: Recreate
  selector:
    matchLabels:
      app: \${APP_NAME}
  template:
    metadata:
      labels:
        app: \${APP_NAME}
    spec:
      containers:
        - name: \${APP_NAME}
          image: \${IMAGE}
          ports:
            - containerPort: \${CONTAINER_PORT}
          readinessProbe:
            httpGet:
              path: /readyz
              port: \${CONTAINER_PORT}
            periodSeconds: 5`,
      },
      {
        title: 'workflow job steps',
        language: 'yaml',
        code: `steps:
  - uses: actions/checkout@v4
  - name: Deploy by digest
    run: kubectl -n "\${NAMESPACE}" set image "deploy/\${APP_NAME}" "\${APP_NAME}=\${IMAGE}"
  - name: Wait for rollout
    run: kubectl -n "\${NAMESPACE}" rollout status "deploy/\${APP_NAME}" --timeout=180s
  - name: Roll back on failure
    if: failure()
    run: kubectl -n "\${NAMESPACE}" rollout undo "deploy/\${APP_NAME}"`,
      },
    ],
  },
  {
    id: 'rolling',
    name: 'Rolling update',
    tagline: 'Replace instances gradually; the Kubernetes default.',
    useWhen:
      'Stateless services where v1 and v2 can run side by side behind the same Service.',
    rollback: 'kubectl rollout undo is gradual, and mixed versions serve traffic meanwhile.',
    resourceCost: '1x plus surge',
    risk: 'Medium: a bad version leaks out before probes catch it.',
    caveat:
      'Zero downtime holds only with maxUnavailable: 0 and honest readiness probes. Database migrations must be expand/contract.',
    variables: ['APP_NAME', 'NAMESPACE', 'IMAGE', 'REPLICAS', 'CONTAINER_PORT'],
    snippets: [
      {
        title: 'deployment.yaml',
        language: 'yaml',
        code: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: \${APP_NAME}
  namespace: \${NAMESPACE}
spec:
  replicas: \${REPLICAS}
  minReadySeconds: 10
  progressDeadlineSeconds: 180
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 25%
      maxUnavailable: 0
  selector:
    matchLabels:
      app: \${APP_NAME}
  template:
    metadata:
      labels:
        app: \${APP_NAME}
    spec:
      containers:
        - name: \${APP_NAME}
          image: \${IMAGE}
          readinessProbe:
            httpGet:
              path: /readyz
              port: \${CONTAINER_PORT}`,
      },
      {
        title: 'workflow job steps',
        language: 'yaml',
        code: `steps:
  - name: Deploy by digest
    run: kubectl -n "\${NAMESPACE}" set image "deploy/\${APP_NAME}" "\${APP_NAME}=\${IMAGE}"
  - name: Gate on rollout health
    run: kubectl -n "\${NAMESPACE}" rollout status "deploy/\${APP_NAME}" --timeout=300s
  - name: Roll back on failure
    if: failure()
    run: kubectl -n "\${NAMESPACE}" rollout undo "deploy/\${APP_NAME}"`,
      },
    ],
  },
  {
    id: 'blue-green',
    name: 'Blue-green',
    tagline: 'Two identical environments; flip traffic at the Service.',
    useWhen: 'You need an instant cutover and instant rollback and can afford two full stacks.',
    rollback: 'Flip the Service selector back, in seconds.',
    resourceCost: '~2x during cutover',
    risk: 'Low for the app; the database schema must work for both versions.',
    caveat:
      'The schema is the usual rollback blocker. On a zero-cost stack the second environment is the expensive part.',
    variables: ['APP_NAME', 'NAMESPACE', 'IMAGE', 'REPLICAS', 'CONTAINER_PORT', 'IDLE_SLOT', 'LIVE_SLOT'],
    snippets: [
      {
        title: 'idle slot + service',
        language: 'yaml',
        code: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: \${APP_NAME}-\${IDLE_SLOT}
  namespace: \${NAMESPACE}
spec:
  replicas: \${REPLICAS}
  selector:
    matchLabels:
      app: \${APP_NAME}
      slot: \${IDLE_SLOT}
  template:
    metadata:
      labels:
        app: \${APP_NAME}
        slot: \${IDLE_SLOT}
    spec:
      containers:
        - name: \${APP_NAME}
          image: \${IMAGE}
          readinessProbe:
            httpGet:
              path: /readyz
              port: \${CONTAINER_PORT}
---
apiVersion: v1
kind: Service
metadata:
  name: \${APP_NAME}
  namespace: \${NAMESPACE}
spec:
  selector:
    app: \${APP_NAME}
    slot: \${LIVE_SLOT}
  ports:
    - port: 80
      targetPort: \${CONTAINER_PORT}`,
      },
      {
        title: 'workflow job steps',
        language: 'yaml',
        code: `steps:
  - name: Deploy to the idle slot
    run: kubectl -n "\${NAMESPACE}" set image "deploy/\${APP_NAME}-\${IDLE_SLOT}" "\${APP_NAME}=\${IMAGE}"
  - name: Wait for idle slot
    run: kubectl -n "\${NAMESPACE}" rollout status "deploy/\${APP_NAME}-\${IDLE_SLOT}" --timeout=180s
  - name: Smoke-test the idle slot before cutover
    run: ./scripts/smoke.sh --slot "\${IDLE_SLOT}"
  - name: Flip traffic
    run: |
      kubectl -n "\${NAMESPACE}" patch svc "\${APP_NAME}" \\
        -p "{\\"spec\\":{\\"selector\\":{\\"app\\":\\"\${APP_NAME}\\",\\"slot\\":\\"\${IDLE_SLOT}\\"}}}"
  - name: Flip back on failure
    if: failure()
    run: |
      kubectl -n "\${NAMESPACE}" patch svc "\${APP_NAME}" \\
        -p "{\\"spec\\":{\\"selector\\":{\\"app\\":\\"\${APP_NAME}\\",\\"slot\\":\\"\${LIVE_SLOT}\\"}}}"`,
      },
    ],
  },
  {
    id: 'canary',
    name: 'Canary',
    tagline: 'Send a small share of traffic to the new version, then widen.',
    useWhen: 'You want real-traffic validation with a small blast radius and have trustworthy metrics.',
    rollback: 'Set the canary weight to 0. Fast.',
    resourceCost: '1x plus a small canary',
    risk: 'Low, provided the SLO check actually gates each step.',
    caveat:
      'Plain Kubernetes has no weighted routing; this needs a mesh or Gateway API. A shell loop is a teaching sketch, not a production controller: use Argo Rollouts or Flagger for automated analysis.',
    variables: ['APP_NAME', 'NAMESPACE', 'IMAGE', 'CANARY_STEPS'],
    snippets: [
      {
        title: 'virtualservice.yaml (Istio)',
        language: 'yaml',
        code: `${ISTIO_SUBSETS}
---
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: \${APP_NAME}
  namespace: \${NAMESPACE}
spec:
  hosts:
    - \${APP_NAME}
  http:
    - route:
        - destination:
            host: \${APP_NAME}
            subset: stable
          weight: 90
        - destination:
            host: \${APP_NAME}
            subset: next
          weight: 10`,
      },
      {
        title: 'workflow job steps',
        language: 'yaml',
        code: `steps:
  - name: Deploy the canary pods
    run: kubectl -n "\${NAMESPACE}" set image "deploy/\${APP_NAME}-next" "\${APP_NAME}=\${IMAGE}"
  - name: Widen traffic, gating each step on the SLO
    run: |
      for weight in \${CANARY_STEPS}; do
        ./scripts/set-weight.sh --service "\${APP_NAME}" --next-weight "\${weight}"
        ./scripts/check-slo.sh --service "\${APP_NAME}" --window 5m
      done
  - name: Drain the canary on failure
    if: failure()
    run: ./scripts/set-weight.sh --service "\${APP_NAME}" --next-weight 0`,
      },
    ],
  },
  {
    id: 'ab-testing',
    name: 'A/B testing',
    tagline: 'Route by user attribute or header to compare business metrics.',
    useWhen:
      'You are running an experiment on conversion or engagement, not de-risking a release.',
    rollback: 'Remove the routing rule.',
    resourceCost: '1x plus the variant',
    risk: 'Statistical rather than operational: needs sticky assignment and enough sample.',
    caveat:
      'A/B is a traffic experiment, not a safety mechanism. Assignment must be sticky (cookie or user id) or the metric is meaningless.',
    variables: ['APP_NAME', 'NAMESPACE', 'IMAGE', 'VARIANT_COOKIE'],
    snippets: [
      {
        title: 'virtualservice.yaml (Istio, cookie match)',
        language: 'yaml',
        code: `# Reuses the stable/next DestinationRule from the Canary tab.
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: \${APP_NAME}
  namespace: \${NAMESPACE}
spec:
  hosts:
    - \${APP_NAME}
  http:
    - match:
        - headers:
            cookie:
              regex: ".*\${VARIANT_COOKIE}=b.*"
      route:
        - destination:
            host: \${APP_NAME}
            subset: next
    - route:
        - destination:
            host: \${APP_NAME}
            subset: stable`,
      },
      {
        title: 'workflow job steps',
        language: 'yaml',
        code: `steps:
  - name: Deploy the variant
    run: kubectl -n "\${NAMESPACE}" set image "deploy/\${APP_NAME}-next" "\${APP_NAME}=\${IMAGE}"
  - name: Apply the routing rule
    run: kubectl -n "\${NAMESPACE}" apply -f k8s/vs-ab.yaml
  - name: Assert assignment routes to the variant
    run: ./scripts/assert-assignment.sh --cookie "\${VARIANT_COOKIE}=b" --expect next
  - name: Restore stable routing on failure
    if: failure()
    run: kubectl -n "\${NAMESPACE}" apply -f k8s/vs-stable.yaml`,
      },
    ],
  },
  {
    id: 'shadow',
    name: 'Shadow',
    tagline: 'Mirror production traffic to the new version; users never see its answers.',
    useWhen:
      'You want to validate a new version against real traffic with zero user impact, including model and prompt candidates.',
    rollback: 'Nothing to roll back for users: delete the shadow.',
    resourceCost: '~2x for mirrored traffic',
    risk: 'Side effects (writes, emails, payments) are duplicated unless the shadow is sandboxed.',
    caveat:
      'The shadow must use stubbed or sandboxed downstream writes. Mirrored responses are discarded, so correctness has to be compared offline.',
    variables: ['APP_NAME', 'NAMESPACE', 'IMAGE', 'MIRROR_PERCENT', 'COMPARE_WINDOW'],
    snippets: [
      {
        title: 'virtualservice.yaml (Istio mirror)',
        language: 'yaml',
        code: `# Reuses the stable/next DestinationRule from the Canary tab.
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: \${APP_NAME}
  namespace: \${NAMESPACE}
spec:
  hosts:
    - \${APP_NAME}
  http:
    - route:
        - destination:
            host: \${APP_NAME}
            subset: stable
      mirror:
        host: \${APP_NAME}
        subset: next
      mirrorPercentage:
        value: \${MIRROR_PERCENT}`,
      },
      {
        title: 'workflow job steps',
        language: 'yaml',
        code: `steps:
  - name: Deploy the shadow pods
    run: kubectl -n "\${NAMESPACE}" set image "deploy/\${APP_NAME}-next" "\${APP_NAME}=\${IMAGE}"
  - name: Start mirroring
    run: kubectl -n "\${NAMESPACE}" apply -f k8s/vs-shadow.yaml
  - name: Compare shadow against stable offline
    run: ./scripts/compare-shadow.sh --service "\${APP_NAME}" --window "\${COMPARE_WINDOW}"
  - name: Stop mirroring
    if: always()
    run: kubectl -n "\${NAMESPACE}" apply -f k8s/vs-stable.yaml`,
      },
    ],
  },
];
