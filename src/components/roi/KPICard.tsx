import CountUp from 'react-countup';
import type { KPICardProps } from '@/types/roi';

const KPICard = ({ icon, title, value, prefix, suffix, isCurrency, color, bottomLabel }: KPICardProps) => (
    <div className="flex flex-col h-full card-base p-5 hover:shadow-md transition-shadow">
        <div className="flex-grow flex flex-col justify-center">
            <div className="flex justify-between items-center mb-2">
                <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{title}</div>
                <div className="p-1.5 bg-zinc-50 dark:bg-zinc-800 rounded-lg">{icon}</div>
            </div>

            <div
              className={`text-5xl lg:text-6xl font-black tracking-tighter leading-none ${color} mb-1`}
              aria-live="polite"
              aria-atomic="true"
            >
                {prefix}
                <CountUp end={value} separator="," duration={0.3} decimals={isCurrency ? 0 : 1} />
                {suffix && <span className="text-2xl text-zinc-400 ml-1 font-bold align-baseline">{suffix}</span>}
            </div>
        </div>

        <div className="pt-3 border-t border-zinc-50 dark:border-zinc-800 mt-auto">
             <div className="text-sm text-zinc-500 dark:text-zinc-400 leading-snug">
                {bottomLabel}
             </div>
        </div>
    </div>
);

export default KPICard;
