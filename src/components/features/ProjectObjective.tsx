import { MANNING_BOOK_URL } from '@/constants/site';

export default function ProjectObjective() {
  return (
    <div className="mb-6">
      <span className="text-micro font-bold uppercase tracking-widest text-zinc-400 mb-2 block">
        Project Objective
      </span>
      <div className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed space-y-3">
        <p>
          This Space is the visible layer of a bigger constraint: development happens on a
          MacBook and an AMD desktop — neither has an NVIDIA GPU — so CUDA and lower-level C/C++
          kernel work only exists here because of free-tier cloud compute. The goal is to mimic
          production-grade ML infrastructure end-to-end, at zero out-of-pocket cost, using
          biochemical data as the working domain (methodology drawn from N. Flynn&apos;s{' '}
          <a
            href={MANNING_BOOK_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-zinc-300 dark:decoration-zinc-700 hover:text-blue-600 dark:hover:text-blue-400"
          >
            Build AI Drug Discovery Pipelines
          </a>{' '}
          (Manning, 2025)).
        </p>
        <p>
          The Job Board&apos;s Neon Postgres backend already models versioned records; the next
          step extends that same pattern into a training/inference registry — dataset, model,
          and code versions tracked together — feeding a transformer serving path that,
          longer-term, adopts paged-attention/paged-state serving optimizations.
        </p>
        <p>
          The compute grid below is that plan made concrete: five free tiers spanning CPU, GPU,
          and TPU, each with real constraints rather than idealized specs. ZeroGPU is live today;
          Colab&apos;s T4 is next for kernel debugging outside ZeroGPU&apos;s metered queue;
          Colab&apos;s TPU v5e-1 is the eventual target for GPU-vs-TPU inference benchmarking.
          None of it requires a credit card — that&apos;s deliberate, so the same path is
          repeatable by anyone else without out-of-pocket cost.
        </p>
      </div>
    </div>
  );
}
