import Badge from '@/components/ui/Badge';
import CodeBlock from '@/components/ui/CodeBlock';
import type { CodeProgressionLanguageTrack } from '@/constants/practicalTechnical';

interface LanguageProgressionTrackProps {
  track: CodeProgressionLanguageTrack;
}

/**
 * One language's functional -> robust -> optimized worked example — three
 * stacked CodeBlocks with a caption of what changed and the metric it
 * targets at each stage. Pure UI — depends only on the `track` prop.
 */
const LanguageProgressionTrack = ({ track }: LanguageProgressionTrackProps) => (
  <div className="card-base p-4 sm:p-5">
    <h4 className="text-sm font-bold text-zinc-900 dark:text-white">{track.label}</h4>
    <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
      {track.scenario}
    </p>

    <div className="mt-4 space-y-4">
      {track.examples.map((example) => (
        <div key={example.stageId}>
          <Badge color="blue" variant="outline" className="mb-1.5">
            {example.stageLabel}
          </Badge>
          <CodeBlock code={example.code} />
          <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            {example.whatChanged}
          </p>
          <p className="mt-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
            {example.metric}
          </p>
        </div>
      ))}
    </div>
  </div>
);

export default LanguageProgressionTrack;
