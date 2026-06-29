import React from 'react';
import { Users, HeartHandshake, Mic2, GraduationCap, BookOpen, Dumbbell } from 'lucide-react';

const LEADERSHIP_ACTIVITIES = [
  {
    icon: Mic2,
    text: 'Produce and publish MLOps-focused educational content on YouTube and LinkedIn through an automated CI/CD publishing pipeline, driving developer community engagement and technical thought leadership.',
  },
  {
    icon: GraduationCap,
    text: 'Student Outreach Ambassador supporting 100,000+ community college transfer students through peer-to-peer mentorship programs, transfer outreach initiatives, and cross-institutional community building.',
  },
  {
    icon: Users,
    text: 'Active member of AIChE, ISPE, and Rosetta protein engineering community; panelist at the Ipsos AI Insights Community and inaugural Unintentional Consequences of Technology (UCOT) conference.',
  },
  {
    icon: BookOpen,
    text: 'Organize collaborative workshops and learning initiatives including Interview Kickstart bootcamp peer sessions, Databricks weekly seminars, and enterprise analytics community forums.',
  },
  {
    icon: Dumbbell,
    text: 'Coach students ages 3 to adult in Brazilian jiu-jitsu, delivering structured athletic training to build discipline, resilience, and community belonging in Oakland.',
  },
] as const;

const HONORS = [
  'AvenueE Engineering Leadership Program',
  'McNair Scholars TRIO Fellow',
  'Genentech Leadership Exchange',
] as const;

const AboutMeSection: React.FC = () => {
  return (
    <section id="about" className="mb-16 scroll-mt-24 space-y-6">

      {/* PROFESSIONAL SUMMARY — full width */}
      <div className="bg-zinc-50 dark:bg-zinc-900/50 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <h4 className="font-bold text-lg text-zinc-900 dark:text-white mb-3">Professional Summary</h4>

        <div className="space-y-4 text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
          <p>
            Full Stack AI Engineer with <strong className="text-zinc-900 dark:text-white">7+ years of professional experience</strong> designing and deploying production systems across the full software engineering and machine learning lifecycle. Architects end-to-end platforms spanning React and Next.js frontends, Python and Node.js backend services, and RESTful APIs exposing ML capabilities to end users.
          </p>

          <p>
            Builds and operates <strong className="text-zinc-900 dark:text-white">containerized MLOps pipelines</strong> on GCP and AWS with CI/CD automation, prompt engineering, and model monitoring for domain-specific LLM accuracy. Owns <strong className="text-zinc-900 dark:text-white">0-to-1 system design</strong> through production observability, collaborating with technical and non-technical stakeholders to evaluate engineering trade-offs and deliver measurable business outcomes.
          </p>

          {/* Current Focus */}
          <div className="mt-6 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2 mb-2">
              <div className="relative flex h-2 w-2">
                <span className="animate-ping motion-reduce:animate-none absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </div>
              <span className="text-micro font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">
                Current Focus (Jun 2026)
              </span>
            </div>
            <div className="bg-zinc-100 dark:bg-zinc-800/50 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700">
              <p className="text-xs text-zinc-700 dark:text-zinc-300 font-medium">
                Actively searching for new roles in AI/ML Engineering.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* LEADERSHIP — full width */}
      <div className="bg-white dark:bg-black p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:border-pink-300 transition-colors shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <HeartHandshake className="text-pink-500" size={20} />
          <h5 className="font-bold text-zinc-900 dark:text-white">Leadership</h5>
        </div>

        <ul className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
          {LEADERSHIP_ACTIVITIES.map(({ icon: Icon, text }) => (
            <li key={text.slice(0, 30)} className="flex items-start gap-2 text-xs text-zinc-500 dark:text-zinc-400 leading-snug">
              <Icon size={12} className="text-pink-400 mt-0.5 shrink-0" />
              <span>{text}</span>
            </li>
          ))}
        </ul>

        <div className="mt-5 pt-4 border-t border-zinc-100 dark:border-zinc-800">
          <span className="text-micro font-bold uppercase tracking-widest text-zinc-400 mb-2 block">Honors</span>
          <div className="flex flex-wrap gap-1.5">
            {HONORS.map((honor) => (
              <span key={honor} className="text-xs bg-pink-50 dark:bg-pink-900/10 border border-pink-100 dark:border-pink-900/30 text-pink-700 dark:text-pink-300 px-2 py-0.5 rounded">
                {honor}
              </span>
            ))}
          </div>
        </div>
      </div>

    </section>
  );
};

export default AboutMeSection;
