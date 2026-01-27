'use client';

import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';

interface VoiceControlsProps {
  // Speech Recognition (STT)
  isListening: boolean;
  onToggleListening: () => void;
  sttSupported: boolean;
  sttError: string | null;
  // Speech Synthesis (TTS)
  ttsEnabled: boolean;
  onToggleTts: () => void;
  isSpeaking: boolean;
  ttsSupported: boolean;
  // Disabled state (e.g., when loading)
  disabled?: boolean;
}

export default function VoiceControls({
  isListening,
  onToggleListening,
  sttSupported,
  sttError,
  ttsEnabled,
  onToggleTts,
  isSpeaking,
  ttsSupported,
  disabled = false,
}: VoiceControlsProps) {
  return (
    <div className="flex items-center gap-1">
      {/* Microphone (STT) Button */}
      {sttSupported && (
        <button
          type="button"
          onClick={onToggleListening}
          disabled={disabled}
          className={`p-2 rounded-lg transition-all ${
            isListening
              ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse motion-reduce:animate-none'
              : 'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
          aria-label={isListening ? 'Stop listening' : 'Start voice input'}
          title={
            sttError ??
            (isListening ? 'Stop listening' : 'Start voice input')
          }
        >
          {isListening ? <MicOff size={16} /> : <Mic size={16} />}
        </button>
      )}

      {/* Speaker (TTS) Button */}
      {ttsSupported && (
        <button
          type="button"
          onClick={onToggleTts}
          disabled={disabled}
          className={`p-2 rounded-lg transition-all ${
            ttsEnabled
              ? isSpeaking
                ? 'bg-indigo-500 text-white animate-pulse motion-reduce:animate-none'
                : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
              : 'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
          aria-label={ttsEnabled ? 'Disable voice output' : 'Enable voice output'}
          title={ttsEnabled ? 'Voice output on' : 'Voice output off'}
        >
          {ttsEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
        </button>
      )}

      {/* Unsupported Message */}
      {!sttSupported && !ttsSupported && (
        <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
          Voice not supported
        </span>
      )}
    </div>
  );
}
