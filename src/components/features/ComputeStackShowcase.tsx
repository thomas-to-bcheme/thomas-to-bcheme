type ComputeTierStatus = 'live' | 'planned' | 'exploratory';

type ComputeTier = {
  provider: string;
  tier: string;
  hardware: string;
  constraint: string;
  status: ComputeTierStatus;
  statusLabel: string;
};

const STATUS_STYLES: Record<ComputeTierStatus, string> = {
  live: 'bg-emerald-500 dark:bg-emerald-400',
  planned: 'bg-blue-500 dark:bg-blue-400',
  exploratory: 'bg-zinc-400 dark:bg-zinc-500',
};

const STATUS_TEXT_STYLES: Record<ComputeTierStatus, string> = {
  live: 'text-emerald-600 dark:text-emerald-400',
  planned: 'text-blue-600 dark:text-blue-400',
  exploratory: 'text-zinc-500 dark:text-zinc-400',
};

const COMPUTE_TIERS: ComputeTier[] = [
  {
    provider: 'Hugging Face',
    tier: 'CPU Basic',
    hardware: '2 vCPU · 16GB RAM',
    constraint: 'No GPU · Space sleeps after ~48h idle (free tier)',
    status: 'exploratory',
    statusLabel: 'Available',
  },
  {
    provider: 'Hugging Face',
    tier: 'ZeroGPU',
    hardware: 'NVIDIA RTX Pro 6000 Blackwell (48GB slice, shared)',
    constraint: '120s/call quota unauthenticated, 300s free account · 24h rolling window',
    status: 'live',
    statusLabel: 'Live — this page',
  },
  {
    provider: 'Google Colab',
    tier: 'CPU',
    hardware: '2 vCPU · ~12GB RAM',
    constraint: '~12h session cap · ~90min idle disconnect',
    status: 'exploratory',
    statusLabel: 'Available',
  },
  {
    provider: 'Google Colab',
    tier: 'T4 GPU',
    hardware: '1x NVIDIA T4 · 16GB VRAM',
    constraint: 'Same session/idle limits as CPU · usage-based availability',
    status: 'planned',
    statusLabel: 'Planned — kernel debugging',
  },
  {
    provider: 'Google Colab',
    tier: 'TPU v5e-1',
    hardware: '1x TPU v5e chip · ~16GB HBM',
    constraint: 'Session-based availability · JAX/XLA-oriented (PyTorch via torch_xla)',
    status: 'exploratory',
    statusLabel: 'Future — GPU vs. TPU benchmarking',
  },
];

export default function ComputeStackShowcase() {
  return (
    <div className="mb-6">
      <span className="text-micro font-bold uppercase tracking-widest text-zinc-400 mb-2 block">
        Free-Tier Compute Stack
      </span>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {COMPUTE_TIERS.map((computeTier) => (
          <div
            key={`${computeTier.provider}-${computeTier.tier}`}
            className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-3.5"
          >
            <div className="text-[11px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
              {computeTier.provider}
            </div>
            <div className="font-semibold text-sm text-zinc-900 dark:text-white mb-2">
              {computeTier.tier}
            </div>
            <dl className="space-y-1.5 mb-3">
              <div>
                <dt className="text-[10px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                  Hardware
                </dt>
                <dd className="text-xs text-zinc-700 dark:text-zinc-300">{computeTier.hardware}</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                  Constraints
                </dt>
                <dd className="text-xs text-zinc-700 dark:text-zinc-300">{computeTier.constraint}</dd>
              </div>
            </dl>
            <div className="flex items-center gap-1.5">
              <span className={`inline-block h-1.5 w-1.5 rounded-full ${STATUS_STYLES[computeTier.status]}`} />
              <span className={`text-[11px] font-medium ${STATUS_TEXT_STYLES[computeTier.status]}`}>
                {computeTier.statusLabel}
              </span>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-2">
        Specs and limits reflect each provider&apos;s published free tier as of now and change
        without notice — treat them as directional, not contractual.
      </p>
    </div>
  );
}
