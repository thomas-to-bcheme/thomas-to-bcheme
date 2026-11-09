import type { ReactNode } from 'react';

import SectionHeading from '@/components/ui/SectionHeading';
import { BODY_TEXT_CLASS, SECTION_CLASS } from '@/components/sections/sweDe/styles';
import type { ModuleSection } from '@/constants/implementation';
import CodeBlock from './CodeBlock';

interface LessonSectionProps {
  section: ModuleSection;
  eyebrow: string;
  /** Optional extra content rendered after the prose and snippets. */
  children?: ReactNode;
}

const LessonSection = ({ section, eyebrow, children }: LessonSectionProps) => (
  <section id={section.id} className={SECTION_CLASS}>
    <SectionHeading eyebrow={eyebrow} title={section.title} />
    <div className="space-y-3 max-w-3xl">
      {section.body.map((paragraph) => (
        <p key={paragraph} className={BODY_TEXT_CLASS}>
          {paragraph}
        </p>
      ))}
    </div>
    {section.snippets && section.snippets.length > 0 && (
      <div className="mt-5 space-y-4">
        {section.snippets.map((snippet) => (
          <CodeBlock key={`${snippet.language}-${snippet.caption}`} snippet={snippet} />
        ))}
      </div>
    )}
    {children && <div className="mt-5">{children}</div>}
  </section>
);

export default LessonSection;
