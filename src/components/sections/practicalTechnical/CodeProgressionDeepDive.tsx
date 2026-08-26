import FrameworkStepList from '@/components/ui/FrameworkStepList';
import LanguageProgressionTrack from './LanguageProgressionTrack';
import {
  DEVELOPMENT_MINDSETS,
  CODE_PROGRESSION_STEPS,
  CODE_PROGRESSION_LANGUAGE_TRACKS,
  NOMENCLATURE_DISCUSSION_POINTS,
} from '@/constants/practicalTechnical';

const LIST_ITEM_CLASS =
  "text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed pl-4 relative before:content-['—'] before:absolute before:left-0 before:text-zinc-300 dark:before:text-zinc-700";

/**
 * A closer look at the Programming Fundamentals pillar: Kent Beck's "make it
 * work, make it right, make it fast" framed as a live, collaborative
 * discussion with the interviewer rather than a solo checklist — plus what
 * each stage actually looks like in SQL and Python. Nested inside the
 * existing `fundamentals` section (no new top-level nav entry) since this
 * is a deep dive on one of the two pillars above, not a new topic.
 */
const CodeProgressionDeepDive = () => (
  <div className="mt-10">
    <span className="text-micro text-zinc-400 block mb-2">A Closer Look</span>
    <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
      &quot;Make it work, make it right, make it fast&quot;
    </h3>
    <p className="mt-1 text-xs font-semibold text-zinc-400 dark:text-zinc-600">— Kent Beck</p>
    <p className="mt-3 max-w-2xl text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
      Treated here as a conversation, not a solo checklist: every technical interview runs on some
      version of this progression — get something correct first, hold your nose through the
      technical debt, then spend remaining time making it readable and, only after that, fast.
      Treating each transition as a question for the interviewer — rather than a decision made
      silently — is itself part of the signal.
    </p>

    <div className="mt-6 grid gap-4 sm:grid-cols-2">
      {DEVELOPMENT_MINDSETS.map((mindset) => (
        <div key={mindset.id} className="card-base p-4 sm:p-5">
          <h4 className="text-sm font-bold text-zinc-900 dark:text-white mb-1.5">{mindset.label}</h4>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed mb-3">
            {mindset.framing}
          </p>
          <ul className="space-y-1.5">
            {mindset.points.map((point) => (
              <li key={point} className={LIST_ITEM_CLASS}>
                {point}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>

    <p className="mt-8 max-w-2xl text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
      With that lens in place, here is where it actually plays out, stage by stage:
    </p>

    <div className="mt-4">
      <FrameworkStepList steps={CODE_PROGRESSION_STEPS} />
    </div>

    <div className="mt-8 card-base p-4 sm:p-5">
      <h4 className="text-sm font-bold text-zinc-900 dark:text-white mb-3">
        Whose style guide applies here?
      </h4>
      <ul className="space-y-1.5">
        {NOMENCLATURE_DISCUSSION_POINTS.map((point) => (
          <li key={point} className={LIST_ITEM_CLASS}>
            {point}
          </li>
        ))}
      </ul>
    </div>

    <div className="mt-8">
      <h4 className="text-sm font-bold text-zinc-900 dark:text-white mb-1">
        The same progression, in SQL and Python
      </h4>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed mb-4">
        Generic, interview-recognizable examples — not tied to any specific production schema —
        showing what each stage actually changes in the code, and the metric that justified the
        last one.
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        {CODE_PROGRESSION_LANGUAGE_TRACKS.map((track) => (
          <LanguageProgressionTrack key={track.id} track={track} />
        ))}
      </div>
    </div>
  </div>
);

export default CodeProgressionDeepDive;
