import type { SystemDesignQuestion } from './types';

export const FRONTEND_QUESTIONS: SystemDesignQuestion[] = [
  {
    id: 'server-vs-client-component',
    category: 'frontend',
    axes: ['end-to-end'],
    question:
      'Should this render as a Server Component, a Client Component, or be generated statically at build time — and where does interactive state actually need to live?',
    clarifyingSubQuestions: [
      'Does this component need hooks, event handlers, or a browser API (window, localStorage), or is it pure markup from server-known data?',
      'Is the content identical for every visitor, or does it depend on per-request or per-user state?',
      'How far up the tree does marking this a Client Component actually need to push — the whole page, or just the smallest interactive leaf?',
    ],
    approachOptions: [
      {
        label: 'Server Component (the App Router default)',
        whenToUse:
          'Static or per-request server-rendered content with no client interactivity — e.g. most of this page’s own text sections.',
        tradeoffs: 'Ships zero client JS for that component, but no hooks/state/browser APIs are available inside it.',
      },
      {
        label: "Client Component ('use client')",
        whenToUse:
          'Needs state, effects, or a browser API — e.g. this site’s own useActiveSection scroll-spy hook, which is exactly why components like SweCompassSection.tsx must be client components.',
        tradeoffs:
          'Ships JS and pays a hydration cost, so the boundary should be drawn at the smallest leaf component that actually needs it, not the whole page.',
      },
      {
        label: 'Static generation / ISR',
        whenToUse: 'Content is identical for every visitor with no personalization.',
        tradeoffs: 'Fastest possible response, but freshness is bounded by the last build or revalidation.',
      },
    ],
    implementationNotes: [
      {
        consideration: 'The decision compounds up the tree, not just at the component you’re editing',
        dependsOn:
          'Pushing state up to a parent to avoid prop-drilling can silently convert a whole subtree from Server to Client Components — the fix isn’t always "lift state up," it can also be "push the client boundary down" to keep more of the tree server-rendered.',
      },
    ],
    ripplesInto: ['hosting-model'],
    sourceNote: 'synthesized',
  },
];
