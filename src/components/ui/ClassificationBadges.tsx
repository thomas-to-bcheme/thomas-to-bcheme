import Badge from '@/components/ui/Badge';
import {
  ARCHITECTURE_LABELS,
  PARADIGM_LABELS,
  TASK_TYPE_LABELS,
  type LearningParadigm,
  type NeuralArchitecture,
  type TaskType,
} from '@/constants/aiMl/types';

type BadgeColor = 'blue' | 'green' | 'zinc' | 'amber' | 'purple' | 'rose';

/**
 * Fixed colour per value, sitewide. A Record rather than a switch so adding a
 * paradigm is a compile error until it is given a colour — and so "supervised"
 * looks identical on a card, a model page, and a domain page.
 */
const PARADIGM_COLORS: Record<LearningParadigm, BadgeColor> = {
  supervised: 'blue',
  unsupervised: 'purple',
  'semi-supervised': 'amber',
  'self-supervised': 'green',
  reinforcement: 'rose',
};

interface ClassificationBadgesProps {
  paradigms: LearningParadigm[];
  taskTypes: TaskType[];
  architecture?: NeuralArchitecture;
  /** Cards show paradigm + architecture only; full pages show every axis. */
  compact?: boolean;
}

/**
 * The classification axes as one consistent badge row: how it learns
 * (paradigm), what it outputs (task type), and what it is built from
 * (architecture, deep-learning entries only).
 */
const ClassificationBadges = ({
  paradigms,
  taskTypes,
  architecture,
  compact = false,
}: ClassificationBadgesProps) => (
  <div className="flex flex-wrap items-center gap-1.5">
    {paradigms.map((paradigm) => (
      <Badge key={paradigm} color={PARADIGM_COLORS[paradigm]} variant="outline">
        {PARADIGM_LABELS[paradigm]}
      </Badge>
    ))}

    {architecture && (
      <Badge color="zinc" variant="outline">
        {ARCHITECTURE_LABELS[architecture]}
      </Badge>
    )}

    {!compact &&
      taskTypes.map((taskType) => (
        <span key={taskType} className="tag-blue">
          {TASK_TYPE_LABELS[taskType]}
        </span>
      ))}
  </div>
);

export default ClassificationBadges;
