'use client';

import CodeBlock from '@/components/ui/CodeBlock';
import Tabs from '@/components/ui/Tabs';
import type { DeployStrategy } from '@/constants/deployOps/types';

interface StrategyTabsProps {
  strategies: readonly DeployStrategy[];
}

const LABEL_CLASS = 'font-semibold text-zinc-900 dark:text-white';

/**
 * The six release strategies: a comparison table, then one tab per strategy
 * with the mechanism, an honest caveat, and illustrative Kubernetes and GitHub
 * Actions snippets. Receives data as props so it never imports the registry
 * barrel into a client bundle.
 */
const StrategyTabs = ({ strategies }: StrategyTabsProps) => (
  <div className="space-y-6">
    <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
      <table className="w-full min-w-[44rem] border-collapse text-left text-sm">
        <caption className="sr-only">Release strategies compared</caption>
        <thead className="bg-zinc-50 dark:bg-zinc-900 text-micro uppercase tracking-wider text-zinc-400">
          <tr>
            <th scope="col" className="p-3 font-bold">Strategy</th>
            <th scope="col" className="p-3 font-bold">Use when</th>
            <th scope="col" className="p-3 font-bold">Rollback</th>
            <th scope="col" className="p-3 font-bold">Cost</th>
            <th scope="col" className="p-3 font-bold">Risk</th>
          </tr>
        </thead>
        <tbody className="text-zinc-600 dark:text-zinc-400">
          {strategies.map((strategy) => (
            <tr key={strategy.id} className="align-top border-t border-zinc-100 dark:border-zinc-900">
              <th scope="row" className="p-3 font-bold text-zinc-900 dark:text-white whitespace-nowrap">
                {strategy.name}
              </th>
              <td className="p-3 leading-relaxed">{strategy.useWhen}</td>
              <td className="p-3 leading-relaxed">{strategy.rollback}</td>
              <td className="p-3 whitespace-nowrap">{strategy.resourceCost}</td>
              <td className="p-3 leading-relaxed">{strategy.risk}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    <Tabs
      label="Release strategy manifests"
      tabs={strategies.map((strategy) => ({ id: strategy.id, label: strategy.name }))}
    >
      {(activeId) => {
        const strategy = strategies.find((candidate) => candidate.id === activeId);
        if (!strategy) return null;
        return (
          <div className="space-y-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            <p>{strategy.tagline}</p>
            <p>
              <span className={LABEL_CLASS}>How it works: </span>
              {strategy.how}
            </p>
            <p className="text-amber-700 dark:text-amber-400">
              <span className="font-semibold">Caveat: </span>
              {strategy.caveat}
            </p>
            {strategy.snippets.map((snippet) => (
              <CodeBlock key={snippet.title} title={snippet.title} code={snippet.code} />
            ))}
            <p className="text-xs text-zinc-500">
              {'Teaching examples, not production configuration. Render with envsubst, Helm or Kustomize. Variables: '}
              {strategy.variables.map((name) => `\${${name}}`).join(', ')}
            </p>
          </div>
        );
      }}
    </Tabs>
  </div>
);

export default StrategyTabs;
