// src/components/AiGenerator.tsx
'use client'; // 👈 Crucial: Marks this as interactive client-side code

import { useState } from 'react';

export default function AiGenerator() {
  const [generation, setGeneration] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-black/20">
      <div className="flex flex-col gap-4">
        <button
          className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm w-fit"
          onClick={async () => {
            setIsLoading(true);
            try {
              const response = await fetch('/api/completion', {
                method: 'POST',
                body: JSON.stringify({ prompt: 'What is the meaning of life?' }),
              });
              const json = await response.json();
              setGeneration(json.text);
            } catch (err) {
              console.error(err);
              setGeneration("Error generating text");
            } finally {
              setIsLoading(false);
            }
          }}
        >
          {isLoading ? 'Generating...' : 'Ask AI: What is the meaning of life?'}
        </button>

        {generation && (
          <div className="p-4 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-sm text-zinc-700 dark:text-zinc-300">
            {generation}
          </div>
        )}
      </div>
    </div>
  );
}