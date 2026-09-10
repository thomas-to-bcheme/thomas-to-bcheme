import Badge from '@/components/ui/Badge';
import { DOMAIN_FIT_LABELS, type AppliedDomainProfile, type DomainFit, type DomainNotApplicable } from '@/constants/aiMl/types';

type BadgeColor = 'blue' | 'green' | 'zinc' | 'amber';

const FIT_COLORS: Record<DomainFit, BadgeColor> = {
  primary: 'green',
  viable: 'blue',
  adapted: 'amber',
  'not-applicable': 'zinc',
};

const LIST_ITEM_CLASS =
  "text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed pl-4 relative before:content-['—'] before:absolute before:left-0 before:text-zinc-300 dark:before:text-zinc-700";

interface AppliedDomainPanelProps {
  domainLabel: string;
  profile: AppliedDomainProfile | DomainNotApplicable;
  /** Model pages heading each panel; domain pages already have the context. */
  headingLevel?: 'h3' | 'h4';
}

/**
 * One model's relationship to one applied domain — the how / where / why.
 *
 * Used by BOTH the model pages (three featured panels each) and the cross-cut
 * domain pages, deliberately: one component means the two views cannot drift
 * into telling different stories about the same pairing.
 *
 * A `not-applicable` profile renders as a single sentence rather than an empty
 * shell. Saying "this is not a forecaster, and here is why" is judgment signal;
 * padding it out to look like the others would not be.
 */
const AppliedDomainPanel = ({
  domainLabel,
  profile,
  headingLevel = 'h3',
}: AppliedDomainPanelProps) => {
  const Heading = headingLevel;

  return (
    <div className="card-base p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Heading className="text-sm font-bold text-zinc-900 dark:text-white">
          {domainLabel}
        </Heading>
        <Badge color={FIT_COLORS[profile.fit]} variant="outline">
          {DOMAIN_FIT_LABELS[profile.fit]}
        </Badge>
      </div>

      {profile.fit === 'not-applicable' ? (
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
          {profile.why}
        </p>
      ) : (
        <div className="mt-3 space-y-4">
          <div>
            <span className="text-micro text-zinc-400 block mb-1">How</span>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              {profile.how}
            </p>
          </div>

          <div>
            <span className="text-micro text-zinc-400 block mb-1">Where</span>
            <ul className="space-y-1.5">
              {profile.where.map((item) => (
                <li key={item} className={LIST_ITEM_CLASS}>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <span className="text-micro text-zinc-400 block mb-1">Why</span>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              {profile.why}
            </p>
          </div>

          <div>
            <span className="text-micro text-zinc-400 block mb-1">Featurization</span>
            <ul className="space-y-1.5">
              {profile.featurization.map((item) => (
                <li key={item} className={LIST_ITEM_CLASS}>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <span className="text-micro text-zinc-400 block mb-1">Evaluation</span>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              {profile.evaluation}
            </p>
          </div>

          <div>
            <span className="text-micro text-zinc-400 block mb-1">Pitfalls</span>
            <ul className="space-y-1.5">
              {profile.pitfalls.map((item) => (
                <li key={item} className={LIST_ITEM_CLASS}>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppliedDomainPanel;
