/**
 * Barrel export for all components
 * Usage: import { Badge, BentoGrid, HeroSection } from '@/components'
 */

// Layout Components
export { BentoGrid, BentoCard } from './layout/BentoGrid';
export { default as HeroSection } from './sections/HeroSection';
export { default as MotionProvider } from './layout/MotionProvider';
export { default as ImpactMetric } from './layout/ImpactMetric';

// UI Components
export { default as Badge } from './ui/Badge';
export { default as SkipLink } from './ui/SkipLink';
export { default as Button } from './ui/Button';

// Feature Components
export { default as AiGenerator } from './features/AiGenerator';
export { default as ArchitectureDiagram } from './features/ArchitectureDiagram';
export { default as ROICalculation } from './roi';
export { default as ProjectDeepDive } from './features/ProjectDeepDive';

// Section Components
export { default as AboutMeSection } from './sections/AboutMeSection';
export { default as Connect } from './sections/Connect';
export { default as Footer } from './sections/Footer';
export { default as Roadmap } from './sections/Roadmap';

// Voice Components
export { default as VoiceControls } from './voice/VoiceControls';
