import SectionHeading from '@/components/ui/SectionHeading';
import FoundationsSoftwareEngineering from './foundations/FoundationsSoftwareEngineering';
import FoundationsSoftwareArchitecture from './foundations/FoundationsSoftwareArchitecture';
import FoundationsDataEngineering from './foundations/FoundationsDataEngineering';

/**
 * Deep-reference fundamentals, rendered right after the communication
 * scripts — three O'Reilly "Fundamentals of …" books read as three layers:
 * the engineer's habits (Schutta & Vega), the architect's trade-off
 * discipline (Richards & Ford), and the data lifecycle every data/ML system
 * sits on (Reis & Housley). All detail sits in closed accordions so the
 * section scrolls past quickly on the way to the interview framework.
 */
const FoundationsSection = () => (
  <section id="foundations" className="scroll-mt-24 mt-20">
    <SectionHeading eyebrow="Foundations" title="The fundamentals underneath every design" />
    <p className="max-w-2xl text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
      Three layers, each built on the one before: how an engineer approaches a problem, how an
      architect turns that into trade-offs between named characteristics, and the lifecycle data
      moves through before any model or dashboard can trust it. The rest of this page assumes all
      three.
    </p>

    <FoundationsSoftwareEngineering />
    <FoundationsSoftwareArchitecture />
    <FoundationsDataEngineering />
  </section>
);

export default FoundationsSection;
