import Link from 'next/link';
import { ArrowRight, CornerDownRight } from 'lucide-react';

import { getModelBySlug } from '@/constants/aiMl';
import { DECISION_TREE, type DecisionTarget, type DecisionTreeNode } from '@/constants/aiMl/decisionTree';

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2';

/**
 * Turns a DecisionTarget into the route it points at, or null when the target
 * does not resolve yet — model slugs are named in the tree before their content
 * lands, and a dead link is worse than a plain label. verifyAiMl WARNs on
 * unresolved targets structurally and fails once content is marked complete.
 */
function targetHref(target: DecisionTarget): string | null {
  switch (target.kind) {
    case 'category':
      return `/ai-ml/${target.id}`;
    case 'domain':
      return `/ai-ml/applied/${target.id}`;
    case 'group':
      // Group ids are stored as `${categoryId}/${groupId}`; the category page
      // anchors each group section by its own id.
      return `/ai-ml/${target.id.split('/')[0]}#${target.id.split('/')[1]}`;
    case 'model': {
      const model = getModelBySlug(target.id);
      return model ? `/ai-ml/${model.category}/${model.slug}` : null;
    }
  }
}

const childrenOf = (parentId: string): DecisionTreeNode[] =>
  DECISION_TREE.filter((node) => node.parentId === parentId);

/**
 * The hub's navigational logic tree, rendered from DECISION_TREE.
 *
 * Deliberately not MermaidDiagram: mermaid renders client-side and its `click`
 * bindings fight Next's router, so a "visual" tree there would be a picture you
 * cannot navigate. This is server-rendered markup with real <Link>s — which also
 * means the tree is crawlable and keyboard-navigable.
 *
 * Layout is a nested disclosure list rather than an SVG canvas: it degrades
 * correctly to narrow screens (a horizontally-scrolling tree on a phone is
 * unusable), and the questions ARE the content, so they deserve to be text.
 *
 * Depth is bounded by the data — verifyAiMl proves levels ascend strictly and
 * there are no cycles — so this recursion terminates by construction.
 */
const TreeBranch = ({ node }: { node: DecisionTreeNode }) => {
  const children = childrenOf(node.id);

  return (
    <li className="relative pl-5 border-l border-zinc-200 dark:border-zinc-800">
      <span className="absolute -left-px top-0 h-4 w-4 border-l border-b border-zinc-200 dark:border-zinc-800 rounded-bl" />

      <div className="pt-0.5">
        {node.edgeLabel && (
          <p className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 dark:text-blue-400">
            <CornerDownRight size={12} className="shrink-0" />
            {node.edgeLabel}
          </p>
        )}

        <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-white">{node.question}</p>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
          {node.rationale}
        </p>

        {node.target &&
          (() => {
            const href = targetHref(node.target);
            if (!href) {
              return (
                <span className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-zinc-400 dark:text-zinc-600">
                  {node.target.label} — coming soon
                </span>
              );
            }
            return (
              <Link
                href={href}
                className={`mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 dark:text-blue-400 hover:underline rounded-sm ${FOCUS_RING}`}
              >
                {node.target.label}
                <ArrowRight size={13} />
              </Link>
            );
          })()}
      </div>

      {children.length > 0 && (
        <ul className="mt-4 space-y-4">
          {children.map((child) => (
            <TreeBranch key={child.id} node={child} />
          ))}
        </ul>
      )}
    </li>
  );
};

const ModelDecisionTree = () => {
  const root = DECISION_TREE.find((node) => node.parentId === null);
  if (!root) return null;

  return (
    <div className="card-base p-4 sm:p-6">
      <p className="text-sm font-bold text-zinc-900 dark:text-white">{root.question}</p>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-3xl">
        {root.rationale}
      </p>

      <ul className="mt-6 space-y-6">
        {childrenOf(root.id).map((child) => (
          <TreeBranch key={child.id} node={child} />
        ))}
      </ul>
    </div>
  );
};

export default ModelDecisionTree;
