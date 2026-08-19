import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import SiteHeader from '@/components/layout/SiteHeader';
import Footer from '@/components/sections/Footer';
import SectionHeading from '@/components/ui/SectionHeading';
import BehaviouralSidebar from '@/components/sections/behavioural/BehaviouralSidebar';
import BehaviouralMobileToc from '@/components/sections/behavioural/BehaviouralMobileToc';
import BehaviouralIntroEssay from '@/components/sections/behavioural/BehaviouralIntroEssay';
import RoadmapSection from '@/components/sections/behavioural/RoadmapSection';
import FitFramingSection from '@/components/sections/behavioural/FitFramingSection';
import MisFitAxesSection from '@/components/sections/behavioural/MisFitAxesSection';
import SeniorVsStaffSection from '@/components/sections/behavioural/SeniorVsStaffSection';
import ResearchChecklistSection from '@/components/sections/behavioural/ResearchChecklistSection';
import HighSignalStorytellingSection from '@/components/sections/behavioural/HighSignalStorytellingSection';
import StarCarlComparisonSection from '@/components/sections/behavioural/StarCarlComparisonSection';
import EssentialQuestionsSection from '@/components/sections/behavioural/EssentialQuestionsSection';
import CompetencyChapterSection from '@/components/sections/behavioural/competencies/CompetencyChapterSection';
import BeforeInterviewSection from '@/components/sections/behavioural/BeforeInterviewSection';
import DuringInterviewSection from '@/components/sections/behavioural/DuringInterviewSection';
import AfterInterviewSection from '@/components/sections/behavioural/AfterInterviewSection';
import BehaviouralSourcesSection from '@/components/sections/behavioural/BehaviouralSourcesSection';
import { COMPETENCY_CHAPTERS } from '@/constants/behavioural/competencies';

export const metadata: Metadata = {
  title: 'Behavioural — Thomas To',
  description:
    "A full working reference for behavioural interviews, restructured around ByteByteGo's own course: High-Signal Storytelling (Headline, Behavioral Core, Base) as the hero framework in place of STAR, the fit-vs-level lens companies actually score against (role/company fit, seven mis-fit axes, the Four Dimensions career ladder from junior to principal with a self-assessment guide, and pre-interview research tactics), the six essential questions asked in nearly every interview, all nine Part-II competencies — Taking Initiative, Delivery, Problem Solving and Deep Dive, Earning Trust and Dealing with Conflict, Learning and Growth, Customer and User Focus, Innovation, Developing Others, and Strategic Leadership and Thinking Big — each with key signals, red flags, reflection questions, and key takeaways, and the full Before/During/After delivery playbook from Nailing the Interview, with sources linking back to the original course, book, and announcement post throughout.",
};

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black';

export default function BehaviouralPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-black bg-grid-pattern font-sans text-zinc-900 dark:text-zinc-100 selection:bg-blue-500/20">
      <SiteHeader />

      {/* Compact header — constrained width */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-4">
        <Link
          href="/"
          className={`inline-flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded-sm ${FOCUS_RING}`}
        >
          <ArrowLeft size={15} /> Back to home
        </Link>

        <div className="mt-4">
          <span className="text-micro font-bold uppercase tracking-widest text-zinc-400 mb-1 block">
            Interview Prep
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white leading-tight">
            Lead with your thinking, <span className="gradient-text-blue">not the scene</span>
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
            A working reference for behavioural interviews, restructured around ByteByteGo&apos;s own
            course — High-Signal Storytelling as the hero framework, the fit-vs-level lens
            interviewers actually score against, the six essential questions, all nine Part&nbsp;II
            competencies from Taking Initiative through Strategic Leadership, and the full delivery
            playbook for before, during, and after the interview.
          </p>
        </div>
      </div>

      {/* Sidebar + main content grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-8 lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-12">
        <BehaviouralSidebar />

        <main className="min-w-0">
          <BehaviouralMobileToc />

          <BehaviouralIntroEssay />
          <RoadmapSection />

          <section id="fit-vs-level" className="scroll-mt-24 mb-16">
            <SectionHeading eyebrow="What Companies Evaluate" title="Fit vs. level" />
            <p className="mb-4 max-w-3xl text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Every behavioural answer is being scored against two separate questions at once: do
              you fit — this role, this company — and at what level would you operate here.
              Underneath both is a simpler question the interviewer is actually asking themselves:
              do I want to work with this person. Frame answers around business benefit and the
              effect on the people around you, not technical specifics — that&apos;s what actually
              answers it. The next few sections — the mis-fit axes, the career ladder, and how to
              research a company before you walk in — are all aimed at sharpening exactly these two
              questions.
            </p>
            <FitFramingSection />
          </section>

          <section id="common-mis-fits" className="scroll-mt-24 mb-16">
            <SectionHeading eyebrow="Reading The Room" title="Common mis-fits" />
            <p className="mb-4 max-w-3xl text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
              The same choice in a story can be a green flag at one company and a red flag at
              another. These are the recurring axes where that happens — know which side of each
              one the company you&apos;re talking to actually sits on.
            </p>
            <MisFitAxesSection />
          </section>

          <SeniorVsStaffSection />

          <section id="company-research" className="scroll-mt-24 mb-16">
            <SectionHeading eyebrow="Before The Interview" title="Researching what a company really values" />
            <p className="mb-4 max-w-3xl text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
              You&apos;ll never have perfect information, but a little focused research usually
              reveals which side of each fit axis above a company actually rewards — most
              candidates never bother to look.
            </p>
            <ResearchChecklistSection />
          </section>

          <HighSignalStorytellingSection />
          <StarCarlComparisonSection />

          <EssentialQuestionsSection />

          <section className="mb-4 mt-4">
            <SectionHeading eyebrow="Part II" title="The nine competencies" />
            <p className="max-w-3xl text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Beyond the six essential questions, the rest of what a company probes for sorts into
              nine recurring competencies. Each one below covers the same ground: what the
              competency actually means, the tension it's testing your judgment on, the questions
              that surface it, the signals and red flags an interviewer is listening for, and — if
              nothing comes to mind right away — reflection questions built to excavate a real story.
            </p>
          </section>

          {COMPETENCY_CHAPTERS.map((chapter) => (
            <CompetencyChapterSection key={chapter.id} chapter={chapter} />
          ))}

          <BeforeInterviewSection />
          <DuringInterviewSection />
          <AfterInterviewSection />

          <BehaviouralSourcesSection />
        </main>
      </div>

      <Footer />
    </div>
  );
}
