/**
 * The primary resources this page is built from, plus a direct link to each
 * individual ByteByteGo chapter this page's sections are structured around.
 * Rendered last, by BehaviouralSourcesSection — mirrors
 * systemDesignPrep/externalReferences.ts's grouped pattern exactly.
 *
 * This page is my own condensed, restructured take on the course — paraphrase
 * throughout, not a transcription — built to point readers back to these
 * three primary sources for the full depth, the worked example stories per
 * level, and the parts a reference page like this one can't cover.
 */

export type SourceGroup = 'primary' | 'chapters';

export interface SourceGroupMeta {
  id: SourceGroup;
  label: string;
  description: string;
}

export const SOURCE_GROUPS: SourceGroupMeta[] = [
  {
    id: 'primary',
    label: 'Primary Sources',
    description:
      "This page is my own condensed, restructured take on ByteByteGo's behavioral interview course — go here for the original.",
  },
  {
    id: 'chapters',
    label: 'Course Chapters',
    description:
      "Every section on this page maps to one of these chapters, in the course's own order — each one goes deeper than this page has room for, with full level-by-level example stories and cultural-considerations detail.",
  },
];

export interface Source {
  id: string;
  group: SourceGroup;
  title: string;
  url: string;
  whatItOffers: string;
}

export const SOURCES: Source[] = [
  // --- Primary Sources ---
  {
    id: 'course-intro',
    group: 'primary',
    title: 'ByteByteGo — Behavioral Interview Course',
    url: 'https://bytebytego.com/courses/behavioral-interview/introduction',
    whatItOffers:
      "The full course this page is built around — every chapter below, plus the level-by-level example stories, cultural-variation notes, and video lessons this page's text-only condensation leaves out.",
  },
  {
    id: 'bytebytego-blog-announcement',
    group: 'primary',
    title: 'ByteByteGo — "Our New Book on Behavioral Interviews"',
    url: 'https://blog.bytebytego.com/p/our-new-book-on-behavioral-interviews',
    whatItOffers: "ByteByteGo's own announcement post — the origin story and framing behind why they built a dedicated behavioral-interview resource in the first place.",
  },
  {
    id: 'bytebytego-book',
    group: 'primary',
    title: 'Nail the Behavioral Interview (book)',
    url: 'https://a.co/d/05VdcUfM',
    whatItOffers: 'The same framework as the course, as a book — worth it if you prefer reading start to finish over the course\'s chapter-by-chapter format.',
  },

  // --- Course Chapters (in course order) ---
  {
    id: 'ch-intro',
    group: 'chapters',
    title: 'Introduction',
    url: 'https://bytebytego.com/courses/behavioral-interview/introduction',
    whatItOffers: 'Why behavioral performance decides level as much as fit, and why the format resists being faked.',
  },
  {
    id: 'ch-01-roadmap',
    group: 'chapters',
    title: '01 — The Behavioral Interview Roadmap',
    url: 'https://bytebytego.com/courses/behavioral-interview/the-behavioral-interview-roadmap',
    whatItOffers: "The book's own structure, the Three Pillars of Preparation, and a fuller breakdown of how many stories you actually need per company type and level.",
  },
  {
    id: 'ch-02-what-companies',
    group: 'chapters',
    title: '02 — What Companies Are Looking For',
    url: 'https://bytebytego.com/courses/behavioral-interview/what-companies-are-looking-for',
    whatItOffers: 'Role fit vs. company fit in full, the seven mis-fit axes, and worked example stories at each rung of the Four Dimensions rubric.',
  },
  {
    id: 'ch-03-hss',
    group: 'chapters',
    title: '03 — High-Signal Storytelling',
    url: 'https://bytebytego.com/courses/behavioral-interview/high-signal-storytelling',
    whatItOffers: "This page's hero framework, in the original — the Headline, Behavioral Core, and Base, and a deeper treatment of how it compares to STAR and CARL.",
  },
  {
    id: 'ch-04-essential-questions',
    group: 'chapters',
    title: '04 — The Essential Questions',
    url: 'https://bytebytego.com/courses/behavioral-interview/the-essential-questions',
    whatItOffers: 'The six questions asked in nearly every interview, each worked through with more example language than fits here.',
  },
  {
    id: 'ch-05-taking-initiative',
    group: 'chapters',
    title: '05 — Taking Initiative',
    url: 'https://bytebytego.com/courses/behavioral-interview/taking-initiative',
    whatItOffers: 'Level-by-level example stories for this competency, plus the full "should you mention working nights and weekends" discussion.',
  },
  {
    id: 'ch-06-delivery',
    group: 'chapters',
    title: '06 — Delivery',
    url: 'https://bytebytego.com/courses/behavioral-interview/delivery',
    whatItOffers: 'Level-by-level example stories for this competency, with more detail on managing delivery expectations upward.',
  },
  {
    id: 'ch-07-problem-solving',
    group: 'chapters',
    title: '07 — Problem Solving and Deep Dive',
    url: 'https://bytebytego.com/courses/behavioral-interview/problem-solving-and-deep-dive',
    whatItOffers: 'Level-by-level example stories for this competency, plus a fuller treatment of cross-system diagnostic judgment.',
  },
  {
    id: 'ch-08-trust-conflict',
    group: 'chapters',
    title: '08 — Earning Trust and Dealing with Conflict',
    url: 'https://bytebytego.com/courses/behavioral-interview/earning-trust-and-dealing-with-conflict',
    whatItOffers: 'Level-by-level example stories for this competency, and a deeper split between the proactive trust-building and reactive conflict-management halves.',
  },
  {
    id: 'ch-09-learning-growth',
    group: 'chapters',
    title: '09 — Learning and Growth',
    url: 'https://bytebytego.com/courses/behavioral-interview/learning-and-growth',
    whatItOffers: 'Level-by-level example stories for this competency, with more on choosing where to go deep versus stay broad.',
  },
  {
    id: 'ch-10-customer-focus',
    group: 'chapters',
    title: '10 — Customer and User Focus',
    url: 'https://bytebytego.com/courses/behavioral-interview/customer-and-user-focus',
    whatItOffers: 'Level-by-level example stories for this competency, including more on the internal-customer version for engineers without external users.',
  },
  {
    id: 'ch-11-innovation',
    group: 'chapters',
    title: '11 — Innovation',
    url: 'https://bytebytego.com/courses/behavioral-interview/innovation',
    whatItOffers: 'A fuller treatment of the Innovation vs. Optimization test, plus level-by-level example stories for this competency.',
  },
  {
    id: 'ch-12-developing-others',
    group: 'chapters',
    title: '12 — Developing Others',
    url: 'https://bytebytego.com/courses/behavioral-interview/developing-others',
    whatItOffers: 'The full "Mentoring People You Don\'t Manage" and "When Developing Others Gets Difficult" sections, plus level-by-level example stories.',
  },
  {
    id: 'ch-13-strategic-leadership',
    group: 'chapters',
    title: '13 — Strategic Leadership and Thinking Big',
    url: 'https://bytebytego.com/courses/behavioral-interview/strategic-leadership-and-thinking-big',
    whatItOffers: 'A deeper treatment of sequencing cross-org change as a chain of proof points, plus level-by-level example stories for this competency.',
  },
  {
    id: 'ch-14-nailing-interview',
    group: 'chapters',
    title: '14 — Nailing the Interview',
    url: 'https://bytebytego.com/courses/behavioral-interview/nailing-the-interview',
    whatItOffers: 'The full delivery playbook — before, during, and after the interview — with more detail than fits in three sections here.',
  },
];
