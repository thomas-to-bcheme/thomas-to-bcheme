import { InlineMath } from 'react-katex';
import type { VariableDefProps } from '@/types/roi';

const VariableDef = ({ symbol, desc }: VariableDefProps) => (
    <div className="flex items-center gap-4">
        <span className="font-mono font-bold text-sm w-12 text-center tag-blue py-1 shrink-0">
            <InlineMath math={symbol} />
        </span>
        <span className="text-sm text-zinc-600 dark:text-zinc-300">{desc}</span>
    </div>
);

export default VariableDef;
