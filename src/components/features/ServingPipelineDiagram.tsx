import { ArrowRight, ArrowDownRight } from 'lucide-react';

type PipelineTone = 'neutral' | 'live' | 'next';

type PipelineStage = {
  label: string;
  detail: string;
  tier: string;
  tone: PipelineTone;
};

const TONE_DOT_STYLES: Record<PipelineTone, string> = {
  neutral: 'bg-zinc-400 dark:bg-zinc-500',
  live: 'bg-emerald-500 dark:bg-emerald-400',
  next: 'bg-blue-500 dark:bg-blue-400',
};

const TONE_TEXT_STYLES: Record<PipelineTone, string> = {
  neutral: 'text-zinc-500 dark:text-zinc-400',
  live: 'text-emerald-600 dark:text-emerald-400',
  next: 'text-blue-600 dark:text-blue-400',
};

const PIPELINE_STAGES: PipelineStage[] = [
  {
    label: 'Training',
    detail: 'Dataset + model iteration',
    tier: 'Colab CPU',
    tone: 'neutral',
  },
  {
    label: 'Compile (AOT)',
    detail: 'One-time cost, ahead of serving',
    tier: 'decoupled from serving',
    tone: 'neutral',
  },
  {
    label: 'Serving — now',
    detail: '48GB shared slice, app-level only',
    tier: 'HF ZeroGPU',
    tone: 'live',
  },
];

export default function ServingPipelineDiagram() {
  return (
    <div className="mt-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-4">
      <div className="flex flex-col sm:flex-row items-stretch gap-3 sm:gap-2">
        {PIPELINE_STAGES.map((stage, index) => (
          <div
            key={stage.label}
            className="flex flex-col sm:flex-row items-stretch flex-1 gap-3 sm:gap-2"
          >
            <div className="flex-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <span
                  className={`inline-block h-1.5 w-1.5 rounded-full ${TONE_DOT_STYLES[stage.tone]}`}
                />
                <span className={`text-[11px] font-semibold ${TONE_TEXT_STYLES[stage.tone]}`}>
                  {stage.label}
                </span>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-300 mb-1.5">{stage.detail}</p>
              <p className="text-[10px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                {stage.tier}
              </p>
            </div>
            {index < PIPELINE_STAGES.length - 1 && (
              <div className="flex items-center justify-center text-zinc-300 dark:text-zinc-700 shrink-0">
                <ArrowRight size={16} className="hidden sm:block" />
                <ArrowRight size={16} className="rotate-90 sm:hidden" />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-start gap-2 mt-3 pt-3 border-t border-dashed border-zinc-200 dark:border-zinc-800">
        <ArrowDownRight size={15} className="text-blue-500 dark:text-blue-400 shrink-0 mt-0.5" />
        <p className="text-xs text-zinc-600 dark:text-zinc-300">
          <span className="font-semibold text-blue-600 dark:text-blue-400">Next: </span>
          ZeroGPU only exposes application-level execution — no hardware-level profiling access.
          Long-term kernel benchmarking (assembly/PTX-level, register-level) moves to{' '}
          <span className="font-medium text-zinc-900 dark:text-white">
            Colab T4 GPU / TPU v5e-1
          </span>
          , where the instance is fully addressable.
        </p>
      </div>
    </div>
  );
}
