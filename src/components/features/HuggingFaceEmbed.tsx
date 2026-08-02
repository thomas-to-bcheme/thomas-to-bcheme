import { HUGGING_FACE_SPACE_URL } from '@/constants/site';

export default function HuggingFaceEmbed() {
  return (
    <div className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden">
      <iframe
        src={HUGGING_FACE_SPACE_URL}
        title="Thomas To's ZeroGPU CUDA kernel benchmark — Hugging Face Space"
        className="w-full h-[600px] border-0"
      />
    </div>
  );
}
