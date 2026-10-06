import type { FigureSpec } from '@/constants/sweDe';
import EventTimeFigure from './EventTimeFigure';
import FlowFigure from './FlowFigure';
import FundamentalsFigure from './FundamentalsFigure';
import LadderFigure from './LadderFigure';
import RooflineFigure from './RooflineFigure';
import StripsFigure from './StripsFigure';
import TriangleFigure from './TriangleFigure';

const renderBody = (spec: FigureSpec) => {
  switch (spec.kind) {
    case 'flow':
      return <FlowFigure lanes={spec.lanes} />;
    case 'ladder':
      return <LadderFigure axisLabel={spec.axisLabel} rungs={spec.rungs} />;
    case 'strips':
      return <StripsFigure legend={spec.legend} lanes={spec.lanes} />;
    case 'roofline':
      return (
        <RooflineFigure
          peakComputeLabel={spec.peakComputeLabel}
          bandwidthLabel={spec.bandwidthLabel}
          peakGflops={spec.peakGflops}
          bandwidthGBs={spec.bandwidthGBs}
          points={spec.points}
        />
      );
    case 'triangle':
      return <TriangleFigure corners={spec.corners} markers={spec.markers} />;
    case 'event-time':
      return (
        <EventTimeFigure
          windowEnd={spec.windowEnd}
          watermarkPassesAt={spec.watermarkPassesAt}
          axisMax={spec.axisMax}
          events={spec.events}
        />
      );
  }
};

/** Picks the renderer for a figure spec; the switch is exhaustive, so a new `kind` fails `tsc` until handled. */
const TopicFigure = ({ spec }: { spec: FigureSpec }) => (
  <FundamentalsFigure
    id={spec.id}
    label={spec.label}
    caption={spec.caption}
    sourceIds={spec.sourceIds}
    bookIds={spec.bookIds}
  >
    {renderBody(spec)}
  </FundamentalsFigure>
);

export default TopicFigure;
