import SectionHeading from '@/components/ui/SectionHeading';
import { REFERENCE_GRID_COLUMNS } from '@/constants/systemDesignPrep/referenceGrid';

/**
 * 6-column building-block taxonomy — one card per lifecycle column (Design,
 * Data, Model, Backend, Frontend, Ops), each a compact label+summary list.
 * `details` is intentionally omitted from the default view to keep the grid
 * scannable at 6 columns wide.
 */
const ReferenceGridSection = () => (
  <section id="reference-grid" className="scroll-mt-24 mt-20">
    <SectionHeading eyebrow="Reference" title="The full building-block taxonomy" />
    <p className="max-w-2xl text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed mb-8">
      Six columns spanning a system&apos;s full lifecycle, de-duplicated from the source
      whiteboards — a quick lookup for the vocabulary behind the question bank above.
    </p>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
      {REFERENCE_GRID_COLUMNS.map((column) => {
        const Icon = column.icon;
        return (
          <div key={column.id} className="card-base p-4">
            <div className="flex items-center gap-2 mb-3">
              <Icon size={16} className="stroke-[2.5] text-blue-600 dark:text-blue-400 shrink-0" />
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">{column.label}</h3>
            </div>
            <ul className="space-y-2.5">
              {column.entries.map((entry) => (
                <li key={entry.id} id={entry.id} className="scroll-mt-24">
                  <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                    {entry.label}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-500 leading-relaxed">
                    {entry.summary}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  </section>
);

export default ReferenceGridSection;
