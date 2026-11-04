import React from 'react';

// Leadership & Recognition lives on /projects (LeadershipRecognitionSection) —
// the homepage keeps only the professional summary.
const AboutMeSection: React.FC = () => {
  return (
    <section id="about" className="scroll-mt-24 space-y-6">

      {/* PROFESSIONAL SUMMARY — full width */}
      <div className="bg-zinc-50 dark:bg-zinc-900/50 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <h4 className="font-bold text-lg text-zinc-900 dark:text-white mb-3">Professional Summary</h4>

        <div className="space-y-4 text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
          <p>
            Full Stack AI Engineer with <strong className="text-zinc-900 dark:text-white">7+ years of professional experience</strong> designing and deploying production systems across the full software engineering and machine learning lifecycle. Architects end-to-end platforms spanning React and Next.js frontends, Python and Node.js backend services, and RESTful APIs exposing ML capabilities to end users — including a production RAG AI agent shipped 0-to-1 from system design through open-source distribution that other engineers have since adopted on their own.
          </p>

          <p>
            Builds and operates <strong className="text-zinc-900 dark:text-white">containerized MLOps pipelines</strong> on GCP and AWS with CI/CD automation, prompt engineering, and model monitoring for domain-specific LLM accuracy — including migrating drug-discovery pipelines to run hardware-agnostically across CUDA, TPU, and Apple Silicon rather than one fixed target platform. Owns <strong className="text-zinc-900 dark:text-white">0-to-1 system design</strong> through production observability, collaborating with technical and non-technical stakeholders — up through executives at a parent company — to evaluate engineering trade-offs and deliver measurable business outcomes, for example replacing a manual, spreadsheet-driven revenue analysis with a natural-language RAG agent non-technical stakeholders can query directly.
          </p>

          <p>
            Supports multi-year strategic roadmap planning as the technical liaison between Canventa and its parent company, STEMCELL Technologies — translating a 3–5 year plan into realistic year-by-year and quarter-by-quarter goals and coordinating GCP-hosted, HIPAA-compliant infrastructure decisions across both organizations&apos; engineering, management, and executive stakeholders.
          </p>
        </div>
      </div>

    </section>
  );
};

export default AboutMeSection;
