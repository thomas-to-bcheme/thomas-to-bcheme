import SectionHeading from '@/components/ui/SectionHeading';
import { BODY_TEXT_CLASS, SECTION_CLASS } from '@/components/sections/sweDe/styles';

export const CHECKPOINT_SECTION_ID = 'checkpoint';

interface CheckpointCardProps {
  points: string[];
}

/** The closing trade-off review that ends every module. */
const CheckpointCard = ({ points }: CheckpointCardProps) => (
  <section id={CHECKPOINT_SECTION_ID} className={SECTION_CLASS}>
    <SectionHeading eyebrow="Checkpoint" title="Key trade-offs" />
    <div className="card-base p-4 sm:p-5 border-l-2 border-l-blue-400 dark:border-l-blue-500">
      <ul className="list-disc pl-5 space-y-2 max-w-3xl">
        {points.map((point) => (
          <li key={point} className={BODY_TEXT_CLASS}>
            {point}
          </li>
        ))}
      </ul>
    </div>
  </section>
);

export default CheckpointCard;
