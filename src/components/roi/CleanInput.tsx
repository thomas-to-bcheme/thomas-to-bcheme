import type { CleanInputProps } from '@/types/roi';

const CleanInput = ({ label, val, set, min, max, step, unit }: CleanInputProps) => {
    const inputId = `input-${label.toLowerCase().replace(/\s+/g, '-')}`;
    const ariaValueText = `${val.toLocaleString()}${unit}`;

    return (
        <div className="group">
            <div className="flex justify-between items-end mb-2">
                <label
                    htmlFor={inputId}
                    className="text-micro text-subtle"
                >
                    {label}
                </label>
                <span className="font-mono text-xs font-bold text-zinc-800 dark:text-zinc-200 border-b border-zinc-200 dark:border-zinc-800 pb-0.5">
                    {val.toLocaleString()}{unit}
                </span>
            </div>
            <input
                id={inputId}
                type="range"
                min={min}
                max={max}
                step={step}
                value={val}
                onChange={e => set(+e.target.value)}
                aria-valuemin={min}
                aria-valuemax={max}
                aria-valuenow={val}
                aria-valuetext={ariaValueText}
                className="slider-input"
            />
        </div>
    );
};

export default CleanInput;
