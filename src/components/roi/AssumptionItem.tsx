const AssumptionItem = ({ text }: { text: string }) => (
    <li className="flex gap-3 items-start text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
        <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-600 mt-1.5 shrink-0" />
        {text}
    </li>
);

export default AssumptionItem;
